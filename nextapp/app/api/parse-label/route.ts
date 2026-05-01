import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedLabel {
  productName: string | null;
  sku: string | null;
  invoiceNumber: string | null;
  orderNumber: string | null;
  amount: number | null;
  customerName: string | null;
  courierPartner: string | null;
  courierAWB: string | null;
  deliveryAddress: string | null;
  pincode: string | null;
  weight: string | null;
  date: string | null;
  expectedDeliveryDate: string | null;
}

interface GeminiErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

// ─── Helper: Fetch with Exponential Backoff ───────────────────────────────────
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  backoff = 500
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 503 || res.status === 429) {
      const wait = backoff * Math.pow(2, i) + Math.random() * 300;
      console.warn(`Gemini busy (${res.status}). Retrying in ${Math.round(wait)}ms…`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    return res;
  }
  return fetch(url, options);
}

// ─── Helper: Parse comma-separated env vars ───────────────────────────────────
function parseEnvList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// ─── Helper: Get Claude API Keys and Models ────────────────────────────────────
function getClaudeConfig(): { apiKeys: string[]; models: string[] } {
  const apiKeys = parseEnvList(process.env.CLAUDE_API_KEYS, []);
  const models = parseEnvList(
    process.env.CLAUDE_MODELS,
    ["claude-3-5-sonnet-20241022"]
  );
  return { apiKeys, models };
}

// ─── Helper: Get Gemini API Keys and Models ────────────────────────────────────
function getGeminiConfig(): { apiKeys: string[]; models: string[] } {
  const apiKeys = parseEnvList(
    process.env.GEMINI_API_KEYS,
    [process.env.GEMINI_API_KEY || ""]
  ).filter(Boolean);

  const models = parseEnvList(
    process.env.GEMINI_MODELS,
    [process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview"]
  );

  return { apiKeys, models };
}

// ─── Helper: Call Claude API ────────────────────────────────────────────────────
interface ClaudeErrorResponse {
  error?: {
    type?: string;
    message?: string;
  };
}

async function callClaudeAPI(
  apiKey: string,
  model: string,
  base64: string,
  mimeType: string
): Promise<{ success: boolean; data?: string; status?: number; error?: unknown }> {
  // Convert base64 to media type for Claude
  const mediaType = mimeType === "application/pdf" ? "application/pdf" : "image/jpeg";
  
  const body = {
    model,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT + `

Return ONLY valid JSON matching this structure:
{
  "productName": string|null,
  "sku": string|null,
  "invoiceNumber": string|null,
  "orderNumber": string|null,
  "amount": number|null,
  "customerName": string|null,
  "courierPartner": string|null,
  "courierAWB": string|null,
  "deliveryAddress": string|null,
  "pincode": string|null,
  "weight": string|null,
  "date": string|null,
  "expectedDeliveryDate": string|null
}`,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetchWithRetry(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      },
      2,
      500
    );

    const data = await res.json();

    if (res.ok) {
      const text =
        data.content?.[0]?.type === "text"
          ? data.content[0].text
          : "";
      return { success: true, data: text };
    }

    return { success: false, status: res.status, error: data };
  } catch (err) {
    return { success: false, error: err };
  }
}

// ─── Helper: Call Gemini API ────────────────────────────────────────────────────
async function callGeminiAPI(
  apiKey: string,
  model: string,
  base64: string,
  mimeType: string
): Promise<{ success: boolean; data?: string; status?: number; error?: unknown }> {
  const resolvedMime =
    mimeType === "application/pdf" || mimeType.endsWith("/pdf")
      ? "application/pdf"
      : "image/jpeg";

  const requestBody = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: resolvedMime, data: base64 } },
          { text: EXTRACTION_PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  try {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
      2,
      500
    );

    const data = await res.json();

    if (res.ok) {
      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("") ?? "";
      return { success: true, data: text };
    }

    return { success: false, status: res.status, error: data };
  } catch (err) {
    return { success: false, error: err };
  }
}

// ─── Gemini responseSchema — types MUST be uppercase (Gemini API requirement) ─
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    productName:          { type: "STRING",  nullable: true, description: "Name of the product/item being shipped" },
    sku:                  { type: "STRING",  nullable: true, description: "Product SKU, item code, or article number" },
    invoiceNumber:        { type: "STRING",  nullable: true, description: "Invoice number, bill number, or tax invoice number" },
    orderNumber:          { type: "STRING",  nullable: true, description: "Order number, order ID, or reference number from the seller/platform" },
    amount:               { type: "NUMBER",  nullable: true, description: "Total amount or COD amount in INR as a plain number" },
    customerName:         { type: "STRING",  nullable: true, description: "Recipient or consignee full name" },
    courierPartner:       { type: "STRING",  nullable: true, description: "Courier company: Delhivery, BlueDart, Ekart, DTDC, Xpressbees, Shadowfax, Ecom Express, Amazon Logistics, or Other" },
    courierAWB:           { type: "STRING",  nullable: true, description: "AWB number, tracking number, consignment number, or waybill number" },
    deliveryAddress:      { type: "STRING",  nullable: true, description: "Full delivery address of the recipient, excluding pincode" },
    pincode:              { type: "STRING",  nullable: true, description: "6-digit PIN code of the delivery address" },
    weight:               { type: "STRING",  nullable: true, description: "Package weight including unit, e.g. 500g or 1.2kg" },
    date:                 { type: "STRING",  nullable: true, description: "Order or shipment date in YYYY-MM-DD format" },
    expectedDeliveryDate: { type: "STRING",  nullable: true, description: "Expected delivery date in YYYY-MM-DD format" },
  },
  required: [
    "productName","sku","invoiceNumber","orderNumber","amount",
    "customerName","courierPartner","courierAWB","deliveryAddress",
    "pincode","weight","date","expectedDeliveryDate",
  ],
};


// ─── Detailed extraction prompt ───────────────────────────────────────────────
const EXTRACTION_PROMPT = `You are an expert at reading Indian e-commerce shipping labels and courier waybills.
Carefully examine every part of this label image or PDF and extract the following fields.

FIELD EXTRACTION RULES:

productName:
  - Look for "Product", "Item", "Description", "Article", "Goods" sections
  - Could be at the bottom of the label in a product description area
  - May appear near the SKU or order details section

sku:
  - Look for "SKU", "Item Code", "Style", "Article No", "Product Code"
  - Often alphanumeric (e.g. ABC-123-XL, NIK-AM270-BLK)

invoiceNumber:
  - Look for "Invoice No", "INV", "Bill No", "Tax Invoice", "GST Invoice"
  - Format: often INV-YYYY-XXXX or similar

orderNumber:
  - Look for "Order No", "Order ID", "Order #", "Reference No", "Ref No"
  - Could be from Meesho, Flipkart, Amazon, Myntra, Shopify, etc.
  - Format varies: ORD-XXXX, OD-XXXX, B0XXXX, etc.

amount:
  - Look for "COD Amount", "Cash on Delivery", "Amount", "Total", "Value", "Declared Value"
  - Extract as a plain number (no ₹ symbol, no commas)
  - If multiple amounts appear, prefer the COD/collection amount

customerName:
  - Look for "To:", "Ship To:", "Consignee:", "Deliver To:", "Recipient"
  - This is the RECEIVER's name, not the sender

courierPartner:
  - Identify from the logo, header, or brand name on the label
  - Map to one of: Delhivery, BlueDart, Ekart, DTDC, Xpressbees, Shadowfax, Ecom Express, Amazon Logistics, Other
  - Ekart is Flipkart's courier; Amazon Logistics is for Amazon orders

courierAWB:
  - Look for "AWB No", "AWB#", "Tracking No", "Consignment No", "Waybill No", "Shipment ID", "LRN"
  - Usually a long numeric or alphanumeric string (10-20 characters)
  - Often has a barcode beneath it

deliveryAddress:
  - The RECIPIENT's full address (not the sender/return address)
  - Include house number, street, area, city, state
  - Exclude the PIN code (that goes in pincode field)

pincode:
  - The 6-digit PIN/ZIP code of the DELIVERY address
  - Do not confuse with the sender's pincode

weight:
  - Look for "Weight", "Wt", "Actual Wt", "Charged Wt", "Dead Wt"
  - Include the unit: g, gm, gms, kg, Kg, KG

date:
  - Look for "Order Date", "Booking Date", "Ship Date", "Date", "Booked On"
  - Convert to YYYY-MM-DD format
  - Convert formats like "10 Jan 2024", "10/01/2024", "Jan 10 2024"

expectedDeliveryDate:
  - Look for "Expected Delivery", "Deliver By", "EDD", "Promised Date", "Due Date"
  - Convert to YYYY-MM-DD format

Return null for any field that is genuinely not present on the label.
Do NOT guess or fabricate values. Only extract what is explicitly visible.`;

// ─── POST /api/parse-label ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ─── Require authentication ────────────────────────────────────────────────────
  const { requireAuth } = await import("@/lib/auth/middleware");
  const authResult = await requireAuth(req);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  let body: { base64: string; mimeType: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { base64, mimeType } = body;
  if (!base64 || !mimeType) {
    return NextResponse.json({ error: "Missing base64 or mimeType" }, { status: 400 });
  }

  try {
    const claudeConfig = getClaudeConfig();
    const geminiConfig = getGeminiConfig();

    // ─── TRY CLAUDE FIRST (PRIMARY) ────────────────────────────────────────────
    if (claudeConfig.apiKeys.length > 0 && claudeConfig.apiKeys[0]) {
      console.log("Attempting Claude API (primary)...");
      
      for (const apiKey of claudeConfig.apiKeys) {
        for (const model of claudeConfig.models) {
          console.log(`Trying Claude: ${model} (key: ${apiKey.slice(0, 8)}...)`);
          
          const result = await callClaudeAPI(apiKey, model, base64, mimeType);

          if (result.success && result.data) {
            let parsed: ParsedLabel;
            try {
              parsed = JSON.parse(result.data);
            } catch {
              const clean = result.data
                .replace(/^```json\s*/i, "")
                .replace(/```\s*$/i, "")
                .trim();
              parsed = JSON.parse(clean);
            }
            console.log("Claude API succeeded");
            return NextResponse.json(parsed);
          }

          const statusCode = result.status || 500;
          const error = result.error as ClaudeErrorResponse | undefined;

          // If busy, try next combination
          if (statusCode === 429 || statusCode === 503) {
            console.warn(
              `Claude busy (${statusCode}): ${error?.error?.message || "Unknown error"}`
            );
            continue;
          }

          // Auth/config error, skip Claude and try Gemini
          if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
            console.warn(
              `Claude config error (${statusCode}): ${error?.error?.message || "Invalid key/model"}`
            );
            break;
          }

          // Other error, try next
          console.warn(`Claude error (${statusCode}): ${error?.error?.message || "Unknown"}`);
        }
      }
      console.log("All Claude combinations exhausted, falling back to Gemini...");
    }

    // ─── FALLBACK TO GEMINI ────────────────────────────────────────────────────
    if (geminiConfig.apiKeys.length === 0 || !geminiConfig.apiKeys[0]) {
      return NextResponse.json(
        { error: "Claude exhausted and no Gemini API key configured" },
        { status: 503 }
      );
    }

    console.log("Attempting Gemini API (fallback)...");
    
    for (const apiKey of geminiConfig.apiKeys) {
      for (const model of geminiConfig.models) {
        console.log(`Trying Gemini: ${model} (key: ${apiKey.slice(0, 8)}...)`);
        
        const result = await callGeminiAPI(apiKey, model, base64, mimeType);

        if (result.success && result.data) {
          let parsed: ParsedLabel;
          try {
            parsed = JSON.parse(result.data);
          } catch {
            const clean = result.data
              .replace(/^```json\s*/i, "")
              .replace(/```\s*$/i, "")
              .trim();
            parsed = JSON.parse(clean);
          }
          console.log("Gemini API succeeded");
          return NextResponse.json(parsed);
        }

        const statusCode = result.status || 500;
        const error = result.error as GeminiErrorBody | undefined;

        if (statusCode === 429 || statusCode === 503) {
          console.warn(
            `Gemini busy (${statusCode}): ${error?.error?.message || "Unknown error"}`
          );
          continue;
        }

        if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
          console.error(`Gemini config error (${statusCode}):`, error);
          continue;
        }

        console.warn(`Gemini error (${statusCode}):`, error);
      }
    }

    // ─── ALL PROVIDERS EXHAUSTED ────────────────────────────────────────────────
    console.error("All Claude and Gemini combinations exhausted");
    return NextResponse.json(
      {
        error:
          "Both Claude and Gemini are currently unavailable or rate limited. Please try again later.",
        providers: {
          claude: `${claudeConfig.apiKeys.length} key(s)`,
          gemini: `${geminiConfig.apiKeys.length} key(s)`,
        },
      },
      { status: 503 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("parse-label error:", msg);
    return NextResponse.json(
      { error: "Failed to process label", details: msg },
      { status: 500 }
    );
  }
}