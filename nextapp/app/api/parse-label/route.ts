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

// ─── Helper: Create API key + model combinations ────────────────────────────────
function getApiKeysAndModels(): { apiKeys: string[]; models: string[] } {
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

  const { apiKeys, models } = getApiKeysAndModels();

  if (apiKeys.length === 0 || !apiKeys[0]) {
    return NextResponse.json({ error: "API Keys not configured" }, { status: 500 });
  }

  if (models.length === 0) {
    return NextResponse.json({ error: "Models not configured" }, { status: 500 });
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

  // Resolve correct MIME type for PDFs vs images
  const resolvedMime =
    mimeType === "application/pdf" || mimeType.endsWith("/pdf")
      ? "application/pdf"
      : mimeType.startsWith("image/")
      ? mimeType
      : "application/pdf";

  try {
    // Create all combinations of (apiKey, model) pairs to try
    const combinations: Array<{ apiKey: string; model: string }> = [];
    for (const apiKey of apiKeys) {
      for (const model of models) {
        combinations.push({ apiKey, model });
      }
    }

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

    let lastError: { status: number; error: unknown } | null = null;

    // Try each combination of API key and model
    for (const { apiKey, model } of combinations) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const geminiRes = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const geminiData = await geminiRes.json();

      if (geminiRes.ok) {
        // Success! Extract and return the response
        const geminiJson = geminiData as GeminiGenerateContentResponse;

        const rawText: string =
          geminiJson.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text ?? "")
            .join("") ?? "";

        if (!rawText) {
          const reason = geminiJson.candidates?.[0]?.finishReason;
          throw new Error(`Empty response from Gemini. Finish reason: ${reason ?? "unknown"}`);
        }

        // With responseSchema + responseMimeType="application/json", rawText is already valid JSON
        let parsed: ParsedLabel;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          // Fallback: strip any accidental markdown fences
          const clean = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
          parsed = JSON.parse(clean);
        }

        return NextResponse.json(parsed);
      }

      const errorBody = geminiData as GeminiErrorBody;
      const statusCode = geminiRes.status;

      console.warn(
        `Gemini API error (${model}, key: ${apiKey.slice(0, 8)}..., status ${statusCode}): ${
          errorBody.error?.message || "Unknown error"
        }`
      );

      // If this fails due to being busy (503/429), try the next combination
      if (statusCode === 503 || statusCode === 429) {
        lastError = { status: statusCode, error: errorBody };
        continue;
      }

      // For other errors (404, 400, auth errors), stop and return error
      if (statusCode === 404 || statusCode === 401 || statusCode === 403) {
        console.error("Gemini API configuration error:", {
          model,
          status: statusCode,
          error: errorBody,
        });
        return NextResponse.json(
          {
            error: errorBody.error?.message || "Gemini API configuration error",
            model,
          },
          { status: statusCode }
        );
      }

      // For other 4xx/5xx errors, record and try next combination
      lastError = { status: statusCode, error: errorBody };
    }

    // If we get here, all combinations failed
    console.error("All Gemini API combinations exhausted:", {
      totalCombinations: combinations.length,
      lastError,
    });

    const statusCode = lastError?.status ?? 503;
    const errorBody = lastError?.error as GeminiErrorBody | undefined;

    return NextResponse.json(
      {
        error:
          errorBody?.error?.message ||
          "All API keys and models are currently unavailable or over quota. Please try again later.",
        totalCombinations: combinations.length,
      },
      { status: statusCode }
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