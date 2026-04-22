# Product Requirements Document
## Sales Tracker & Order Management System

**Project Type:** Single-page React application (.jsx)
**Environment:** Production-grade warehouse/e-commerce tool

---

## 🤖 AI-POWERED PDF LABEL READER

**Upload Interface:**
- Drag & drop upload zone AND a click-to-browse button for PDF shipping labels.
- Support **BULK upload**: users can drop multiple PDFs at once.

**Processing Workflow (Per File):**
1. Convert to base64 using the FileReader API.
2. Call Anthropic API (`claude-sonnet-4-20250514`) sequentially (not parallel) to avoid rate limits. Show queue progress (e.g., "Parsing 2 of 5 labels...").
3. **API Setup:**
    - No Authorization header needed (handled externally).
    - Send PDF as: `{ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } }`
    - **System prompt:** *"You are a shipping label parser. Extract ALL fields from the label exactly as they appear. Return ONLY valid JSON, no markdown, no explanation. Fields: { productName, sku, invoiceNumber, orderNumber, amount, customerName, courierPartner, courierAWB, deliveryAddress, pincode, weight, date, expectedDeliveryDate }. Return null for missing fields."*
4. Show per-file progress bar and status (Parsing... / Done / Failed).
5. On success, open a review modal with all parsed fields editable (manual override).
6. **Duplicate Check:** Check existing local orders for duplicate `orderNumber` or `AWB`. If found, show a warning banner: *"Duplicate order detected. Do you want to update existing or add as new?"*
7. Allow user to confirm, edit, or discard each parsed order individually.
8. **Fallback:** "Add Order Manually" button opens the same form empty.

---

## 📋 ORDER FORM — FIELDS

| Category | Fields |
| :--- | :--- |
| **Identifiers** | Product Name, SKU, Invoice Number, Order Number |
| **Customer Info** | Customer Name, Customer Phone (optional) |
| **Logistics** | Courier Partner (Delhivery, BlueDart, Ekart, DTDC, Xpressbees, Other), Courier AWB Number, Delivery Address, Pincode, Weight |
| **Financial/Temporal**| Amount (₹), Order Date (date picker), Expected Delivery Date (date picker) |
| **Classification** | Order Type: `Standard` \| `Return` \| `Refund` (separate badge color per type) |
| **Status** | Order Status dropdown: `Processing` \| `Packed` \| `Dispatched` \| `Delivered` \| `Cancelled` |
| **Priority** | Priority flag: `Normal` \| `Urgent` \| `Pinned/Starred ⭐` |
| **History & Notes** | Internal Comments (textarea, supports multiple entries appended with timestamp and user) |

---

## 📊 DASHBOARD SUMMARY CARDS (Top)

Show live-updating cards using simple CSS/div-based bar indicators (no external chart libraries):
- Total Orders | Total Revenue (₹) | Dispatched | Delivered
- Pending (Processing + Packed) | Overdue (past expected delivery, not delivered)
- Returns | Refunds

*Interaction: Each card is clickable → filters the orders table to that category.*

---

## 📋 ORDERS TABLE

**Columns** (all sortable by clicking header, Shift+Click for secondary sort):
`# | ⭐ | Date | Order No. | Customer | Product | SKU | Amount | Courier | AWB | Type | Status | Expected Delivery | Actions`

**Features:**
- **Bulk Selection:** Checkbox on each row.
- **Color-coded Badges:** - Processing → Amber, Packed → Blue, Dispatched → Purple
  - Delivered → Green, Cancelled → Red, Return → Orange, Refund → Pink
- **Overdue Orders:** Highlight entire row in light red with a 🔴 icon.
- **Starred/Pinned:** Always appear at the top with ⭐ icon.
- **View Details Button:** Full order modal with:
  - All order fields.
  - Full timeline/history log (immutable log of status changes, notes, edits with action, timestamp, and user).
  - Comments thread (chat-style log).
  - AWB tracking link (auto-generated URL per courier).
- **Edit/Delete Buttons:** Inline editing of fields and a confirmation dialog before deletion.

**Bulk Actions Bar** (appears when 1+ checkboxes selected):
- Change Status for all selected → dropdown → Apply
- Export selected → CSV
- Delete selected → with confirmation
- Star/Unstar selected

---

## 🔍 FILTERS, SEARCH & PRESETS

- **Search Bar:** Shortcut: press `/` to focus. Searches customer name, order number, AWB, SKU, product name, pincode.
- **Filter Panel (collapsible):**
  - Status (multi-select checkboxes)
  - Order Type (Standard / Return / Refund)
  - Courier Partner
  - Date Range: Today | This Week | This Month | Custom Range
  - Amount Range (min–max slider)
  - Overdue Only & Starred Only toggles
- **Saved Filter Presets:**
  - "Save current filters as preset" → prompt for name.
  - Presets shown as clickable chips below search bar (e.g., "Today's Dispatches").
  - Stored locally and deletable.

---

## 📤 EXPORT & SHARING

**Export Button Options:**
- **Export All to CSV** — all columns.
- **Export Filtered View to CSV** — only visible rows.
- **Export to Excel (.xlsx)** — formatted with headers, color-coded status column. Load SheetJS dynamically: `import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs'`
- **Print Order Invoice** — print-friendly modal with invoice layout (logo placeholder, order details, billing info, signature line).
- **Generate Packing Slip** — compact print view optimized for A5 paper (Order No., Customer, Product, SKU, AWB, Courier, Address).

**Share Order Status (Public Tracking):**
- "Share" button on each order generates a URL fragment: `#/track/ORDER_NUMBER` (URL hash routing, no backend).
- Render a read-only public tracking page on load if this hash is present: Customer name, Order No., Product, Courier, AWB (masked), Current Status, Expected Delivery, and visual stepper: `[Processing] → [Packed] → [Dispatched] → [Delivered]`.

---

## 🌙 UI / UX & USABILITY

- **Dark Mode:** Toggle button in navbar, persisted in localStorage, uses Tailwind `dark:` classes. Applies to ALL modals, dropdowns, and overlays.
- **Keyboard Shortcuts:** `/` (Search), `N` (New Order), `U` (Upload PDF), `Escape` (Close modals). Help modal on `?`.
- **Offline Mode:** App works with zero network connectivity after initial load. Use `localStorage` as primary store. Show "You are offline" / "You're back online" toast based on `navigator.onLine`.
- **Responsive:** Collapsible mobile sidebar, vertically stacked cards, horizontally scrollable table, camera upload support.
- **Toast Notifications:** Bottom-right, auto-dismiss (3s) for added, updated, deleted, duplicate, overdue, export ready, offline status.

---

## 💾 DATA PERSISTENCE

- **Local Storage Keys:**
  - `salestracker_orders`: All orders
  - `salestracker_presets`: Filter presets
  - `salestracker_darkmode`: Theme preference
- **Initial Boot:** Seed with 3–4 realistic sample orders so the UI is populated on first load.

---

## 🏗️ ARCHITECTURE & TECHNICAL CONSTRAINTS

- Single `.jsx` file, fully self-contained.
- React with hooks (`useState`, `useEffect`, `useCallback`, `useRef`, `useMemo`).
- Tailwind CSS (core utility classes).
- `lucide-react` for all icons.
- No external chart libraries.
- Never hardcode or expose any API key.

### ⚠️ CRITICAL IMPLEMENTATION NOTES
1. Bulk PDF parsing must process files **sequentially** to avoid rate limits.
2. Each parsed order must go through the duplicate check before being added.
3. The timeline log must be **immutable** — never delete history entries.
4. All date comparisons for overdue detection should use **today's date at runtime**.
5. The shared tracking page (`#/track/...`) must render correctly on direct load (handle via `useEffect` + hash check).
6. Starred orders must always sort to the top regardless of other sort settings.
7. The app must function entirely from local state after the initial load.
