# ✅ Sales Tracker & Order Management System — TODO

> Synthesized from: `Sales_Tracker_PRD.md`, `design_doc.md`, `tech_stack.md`
> Status audit performed against: `SalesTracker.jsx` (1454 lines, ~87KB)

---

## 🏗️ Phase 1: Project Setup & Architecture

- [x] Single `.jsx` self-contained React component created (`SalesTracker.jsx`)
- [x] React with hooks (`useState`, `useEffect`, `useCallback`, `useRef`, `useMemo`)
- [x] Tailwind CSS utility classes applied via CDN
- [x] `lucide-react` icons imported and used throughout
- [x] localStorage keys defined and working:
  - `salestracker_orders`
  - `salestracker_presets`
  - `salestracker_darkmode`
- [x] 4 realistic sample orders seeded for first-load experience
- [ ] **Migrate** from single JSX file → Next.js (React) project *(tech_stack.md requirement)*
- [ ] Set up Zustand for global state management *(replacing local useState)*
- [ ] Install and configure Shadcn UI *(on top of existing Tailwind)*
- [ ] Set up Prisma ORM + PostgreSQL database (Supabase or Neon) *(currently all localStorage)*
- [ ] Set up `localforage` (IndexedDB) for persistent order/preset storage *(currently localStorage)*
- [ ] Configure Service Workers for PWA / offline support *(currently just navigator.onLine check)*
- [ ] Install and configure SheetJS locally *(currently loaded dynamically from CDN)*

---

## 🤖 Phase 2: AI-Powered PDF Label Reader

- [x] Drag & drop upload zone UI built
- [x] Click-to-browse button implemented
- [x] Bulk PDF upload supported (multiple files at once)
- [x] FileReader API converts each PDF to base64
- [x] **Sequential** processing queue implemented (files processed one at a time)
- [x] Queue progress indicator shown ("Parsing 2 of 5 labels…")
- [x] Per-file progress bar with statuses: `Pending / Parsing… / Done / Failed`
- [x] Review modal opens after each successful parse (all fields editable)
- [x] Duplicate check on `orderNumber` and `courierAWB` before saving
- [x] Duplicate warning banner with "Update Existing / Add as New / Discard" options
- [x] "Add Order Manually" fallback button on upload modal
- [x] **Switch AI model** from `claude-sonnet-4-20250514` (Anthropic) → **Google Gemini 2.5 Flash** (`gemini-2.5-flash-preview-04-17`) *(per tech_stack.md)* ✅
- [ ] Set up **Inngest or Upstash QStash** for queue management *(currently just `setTimeout` delay)*
- [ ] Move API call to **server-side** route handler *(currently calling Gemini directly from browser — security risk)*

---

## 📋 Phase 3: Order Form

- [x] Product Name, SKU, Invoice Number, Order Number fields
- [x] Customer Name, Customer Phone (optional) fields
- [x] Courier Partner dropdown (Delhivery, BlueDart, Ekart, DTDC, Xpressbees, Other)
- [x] Courier AWB Number, Delivery Address, Pincode, Weight fields
- [x] Amount (₹) with number input
- [x] Order Date + Expected Delivery Date pickers
- [x] Order Type: Standard | Return | Refund (with badge colours)
- [x] Order Status dropdown: Processing | Packed | Dispatched | Delivered | Cancelled
- [x] Priority: Normal | Urgent | Starred
- [x] Internal Notes / Comments (textarea, appended with timestamp + user)

---

## 📊 Phase 4: Dashboard Summary Cards

- [x] Total Orders card
- [x] Total Revenue (₹) card
- [x] Dispatched card
- [x] Delivered card
- [x] Pending (Processing + Packed) card
- [x] Overdue (past expected delivery, not delivered) card
- [x] Returns card
- [x] Refunds card
- [x] Each card is clickable → filters orders table to that category
- [x] Gradient colour coding per card
- [x] **CSS bar indicators** per card (proportional fill bars — relative to Total Orders) ✅

---

## 📋 Phase 5: Orders Table

- [x] All required columns: `# | ⭐ | Date | Order No. | Customer | Product | SKU | Amount | Courier | AWB | Type | Status | Expected Delivery | Actions`
- [x] Single-column sort on header click
- [x] Secondary sort via `Shift+Click`
- [x] Row checkboxes for bulk selection + select-all checkbox
- [x] Color-coded status badges (Processing→Amber, Packed→Blue, Dispatched→Purple, Delivered→Green, Cancelled→Red)
- [x] Type badges (Return→Orange, Refund→Pink)
- [x] Overdue rows highlighted in light red with 🔴 icon
- [x] Starred orders always sort to top
- [x] **View Details modal**: all fields, immutable timeline, chat-style comments, AWB tracking link
- [x] Inline Edit button per row
- [x] Delete button with confirmation dialog
- [x] **Bulk Actions Bar**: Change Status → Apply, Export CSV, Delete Selected, Star Selected
- [x] **Amount Range filter** (min–max slider, ₹0–₹1,00,000 with live value display) ✅

---

## 🔍 Phase 6: Filters, Search & Presets

- [x] Search bar (searches: customerName, orderNumber, courierAWB, sku, productName, pincode)
- [x] `/` keyboard shortcut to focus search
- [x] Collapsible filter panel with:
  - [x] Status multi-select checkboxes
  - [x] Order Type checkboxes
  - [x] Courier Partner checkboxes
  - [x] Date Range: Today | This Week | This Month | Custom Range (with date pickers)
  - [x] Overdue Only toggle
  - [x] Starred Only toggle
  - [x] **Amount Range slider** (min–max dual sliders with live ₹ display) ✅
- [x] Saved Filter Presets: save with name prompt
- [x] Preset chips displayed below search bar
- [x] Presets stored in localStorage (`salestracker_presets`)
- [x] Individual preset deletion

---

## 📤 Phase 7: Export & Sharing

- [x] Export All to CSV
- [x] Export Filtered View to CSV
- [x] Export selected rows to CSV (bulk actions bar)
- [x] Export to Excel (.xlsx) via SheetJS (dynamically imported from CDN)
- [x] Print Order Invoice modal (logo, order details, billing info, signature line)
- [x] Generate Packing Slip (compact A5 format)
- [x] Public order tracking via `#/track/ORDER_NUMBER` URL hash
- [x] Hash-based routing with `useEffect` + `hashchange` listener
- [x] Read-only public tracking page with: Customer Name, Order No., Product, Courier, Masked AWB, Status, Expected Delivery
- [x] Visual status stepper on tracking page: `[Processing] → [Packed] → [Dispatched] → [Delivered]`

---

## 🎨 Phase 8: UI/UX & Design

- [x] Dark mode toggle in navbar
- [x] Dark mode persisted in localStorage
- [x] Dark mode applies to modals, dropdowns, overlays
- [x] Toast notifications (bottom-right, auto-dismiss ~3.5s): added, updated, deleted, duplicate, export, offline, online
- [x] Responsive: mobile search bar, hamburger menu
- [x] Horizontally scrollable table on mobile
- [x] Offline banner at top when disconnected
- [x] `Plus Jakarta Sans` font (via Google Fonts `@import`)
- [x] `JetBrains Mono` for monospace fields (AWB, order IDs)
- [x] Custom scrollbar styling
- [x] Slide-in animation for toasts
- [ ] **Camera upload support on mobile** *(PRD requirement — not implemented)*
- [ ] **Apply design doc color palette** precisely:
  - Primary Background `#F8F9FA`, Accent `#1A73E8`, Success `#10B981`, Danger `#EF4444`, Text `#1F2937`
  - *(Currently using slate/amber palette — partially matches)*
- [ ] **Bento-grid modular layout** for dashboard *(currently a simple CSS grid)*
- [x] **Bar indicators** on dashboard summary cards ✅

---

## ⌨️ Phase 9: Keyboard Shortcuts

- [x] `/` → Focus search bar
- [x] `N` → Open New Order form
- [x] `U` → Open Upload PDF dialog
- [x] `Escape` → Close active modal
- [x] `?` → Open keyboard shortcuts help modal
- [x] `Shift+Click` table header → multi-column sort

---

## 💾 Phase 10: Offline Mode & Data Persistence

- [x] All orders stored in localStorage
- [x] Presets stored in localStorage
- [x] `navigator.onLine` detection with "offline" / "back online" toast
- [x] Offline banner at page top when disconnected
- [x] App functions entirely from local state
- [ ] **PWA Service Worker** for full offline after initial load *(not yet implemented)*
- [ ] **Migrate storage to IndexedDB** via `localforage` *(tech_stack.md requirement)*

---

## 🔐 Phase 11: Security

- [x] No hardcoded API keys in frontend code *(API key must be provided by user at runtime)*
- [ ] **Move Anthropic/Gemini API call to server-side** route handler *(critical — currently calling AI API directly from browser)*
- [ ] OAuth 2.0 / OpenID Connect authentication *(not implemented)*
- [ ] Multi-Factor Authentication (MFA) *(not implemented)*
- [ ] AES-256 encryption for stored credentials *(not implemented)*
- [ ] Data masking UI for sensitive balance fields *(design_doc requirement)*

---

## ⚠️ Phase 12: Critical Implementation Rules — Verification

- [x] Bulk PDF parsing processes files **sequentially** ✅
- [x] Every parsed order passes duplicate check before being added ✅
- [x] Timeline log is **immutable** — entries are never deleted ✅
- [x] Overdue detection uses `new Date()` at runtime ✅
- [x] Tracking page renders correctly on direct `#/track/...` URL load ✅
- [x] Starred orders always sort to the top ✅
- [x] App functions entirely from local state after initial load ✅

---

## 🚀 Phase 13: Next Immediate Actions (Priority Order)

1. **[x] Copy `SalesTracker.jsx` into the `Sales Tracker` git repo** ✅
2. **[ ] Bootstrap a Next.js project** in the `Sales Tracker` folder
3. **[ ] Wrap `SalesTracker.jsx` as a Next.js page component**
4. **[ ] Create a Next.js API route** for the AI PDF parsing (Gemini 1.5 Flash) to keep the API key server-side
5. **[x] Add amount range min–max slider** to the filter panel ✅
6. **[x] Add bar indicators** to dashboard summary cards ✅
7. **[ ] Implement PWA Service Worker**
8. **[ ] Migrate localStorage → IndexedDB** via `localforage`
9. **[ ] Set up Zustand** for global state
10. **[ ] Set up Prisma + Supabase** for cloud persistence (optional sync)

---

## 🔮 Phase 14: Future Roadmap (Post-MVP)

- [ ] AI Insights: automated spending predictions and Smart Savings recommendations
- [ ] Tax Export: one-click CSV/PDF for annual tax filings
- [ ] Social Investing / Shared Budgets
- [ ] Plaid / Open Banking integration for fiat accounts
- [ ] Crypto wallet integration for real-time asset pricing
- [ ] Virtual card management (Freeze, Change Limit, View CVV)

---

## 📊 Completion Summary

| Area | Status |
|---|---|
| AI PDF Reader (UI) | ✅ Complete |
| AI PDF Reader (Model) | ✅ Gemini 1.5 Flash |
| AI PDF Reader (Backend/Security) | ❌ Needs server-side route |
| Order Form (all fields) | ✅ Complete |
| Dashboard Cards | ✅ Complete + bar indicators |
| Orders Table | ✅ Complete |
| Bulk Actions | ✅ Complete |
| Filters & Search | ✅ Complete + amount range slider |
| Export (CSV + Excel) | ✅ Complete |
| Invoice & Packing Slip | ✅ Complete |
| Public Tracking Page | ✅ Complete |
| Dark Mode | ✅ Complete |
| Keyboard Shortcuts | ✅ Complete |
| Offline Detection | ✅ Complete |
| PWA Service Worker | ❌ Not implemented |
| IndexedDB Storage | ❌ Not implemented (localStorage used) |
| Next.js Migration | ❌ Not started |
| Authentication | ❌ Not implemented |
| Database (Supabase/Prisma) | ❌ Not implemented |

---

*Generated from: `Sales_Tracker_PRD.md`, `design_doc.md`, `tech_stack.md` + audit of `SalesTracker.jsx`*
