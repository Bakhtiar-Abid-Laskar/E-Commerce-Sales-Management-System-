import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Package, Star, Upload, Plus, Search, Filter, Download,
  Moon, Sun, Truck, AlertTriangle, CheckCircle, X, Eye,
  Edit, Trash2, ChevronDown, ChevronUp, Keyboard, Copy,
  Printer, Share2, Clock, BarChart3, RefreshCw, FileText,
  WifiOff, Wifi, ChevronRight, MoreVertical, Tag, Phone,
  MapPin, Calendar, Weight, Hash, User, CreditCard,
  ArrowUp, ArrowDown, Bookmark, BookmarkCheck, Bell,
  CheckSquare, Square, Layers, TrendingUp, AlertCircle,
  XCircle, RotateCcw, Home, ExternalLink, Menu, Zap
} from "lucide-react";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const COURIERS = ["Delhivery", "BlueDart", "Ekart", "DTDC", "Xpressbees", "Other"];
const ORDER_TYPES = ["Standard", "Return", "Refund"];
const ORDER_STATUSES = ["Processing", "Packed", "Dispatched", "Delivered", "Cancelled"];
const PRIORITIES = ["Normal", "Urgent", "Starred"];

const STATUS_COLORS = {
  Processing: "bg-amber-100 text-amber-800 dark-status-amber",
  Packed:     "bg-blue-100 text-blue-800 dark-status-blue",
  Dispatched: "bg-purple-100 text-purple-800 dark-status-purple",
  Delivered:  "bg-green-100 text-green-800 dark-status-green",
  Cancelled:  "bg-red-100 text-red-800 dark-status-red",
};

const TYPE_COLORS = {
  Standard: "bg-slate-100 text-slate-700",
  Return:   "bg-orange-100 text-orange-700",
  Refund:   "bg-pink-100 text-pink-700",
};

const COURIER_TRACKING = {
  Delhivery:  (a) => `https://www.delhivery.com/track/package/${a}`,
  BlueDart:   (a) => `https://www.bluedart.com/tracking?trackFor=0&val=${a}`,
  Ekart:      (a) => `https://ekartlogistics.com/track?trackingId=${a}`,
  DTDC:       (a) => `https://www.dtdc.in/tracking.asp?Referanceno=${a}`,
  Xpressbees: (a) => `https://www.xpressbees.com/track?trackingNo=${a}`,
  Other:      ()  => null,
};

const EMPTY_ORDER = {
  productName: "", sku: "", invoiceNumber: "", orderNumber: "",
  amount: "", customerName: "", customerPhone: "",
  courierPartner: "Delhivery", courierAWB: "",
  deliveryAddress: "", pincode: "", weight: "",
  date: new Date().toISOString().split("T")[0],
  expectedDeliveryDate: "", orderType: "Standard",
  status: "Processing", priority: "Normal",
  notes: [], timeline: [], starred: false,
};

const SAMPLE_ORDERS = [
  {
    id: "ord_001", productName: "Sony WH-1000XM5 Headphones", sku: "SON-WH-XM5-BLK",
    invoiceNumber: "INV-2024-0341", orderNumber: "ORD-2024-0341", amount: 29990,
    customerName: "Rahul Sharma", customerPhone: "9876543210",
    courierPartner: "Delhivery", courierAWB: "DEL1234567890",
    deliveryAddress: "B-204, Ansal Towers, Sector 62, Noida", pincode: "201301",
    weight: "320g", date: "2024-01-10", expectedDeliveryDate: "2024-01-15",
    orderType: "Standard", status: "Delivered", priority: "Normal", starred: false,
    notes: [{ text: "Customer requested gift wrapping", timestamp: "2024-01-10T11:00:00", by: "User" }],
    timeline: [
      { action: "Order created", timestamp: "2024-01-10T10:30:00", by: "User" },
      { action: "Status → Dispatched", timestamp: "2024-01-12T14:20:00", by: "User" },
      { action: "Status → Delivered", timestamp: "2024-01-15T16:45:00", by: "User" },
    ],
  },
  {
    id: "ord_002", productName: "Apple AirPods Pro (2nd Gen)", sku: "APL-AIRPODS-PRO2",
    invoiceNumber: "INV-2024-0342", orderNumber: "ORD-2024-0342", amount: 24900,
    customerName: "Priya Patel", customerPhone: "9123456789",
    courierPartner: "BlueDart", courierAWB: "BLU9876543210",
    deliveryAddress: "12, MG Road, Koramangala, Bengaluru", pincode: "560034",
    weight: "180g", date: "2024-01-14",
    expectedDeliveryDate: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    orderType: "Standard", status: "Dispatched", priority: "Urgent", starred: true,
    notes: [],
    timeline: [
      { action: "Order created", timestamp: "2024-01-14T09:15:00", by: "User" },
      { action: "Status → Packed", timestamp: "2024-01-14T15:30:00", by: "User" },
      { action: "Status → Dispatched", timestamp: "2024-01-15T08:00:00", by: "User" },
    ],
  },
  {
    id: "ord_003", productName: "Samsung 4K Monitor 27\"", sku: "SAM-MON-27-4K",
    invoiceNumber: "INV-2024-0343", orderNumber: "ORD-2024-0343", amount: 45000,
    customerName: "Amit Verma", customerPhone: "9988776655",
    courierPartner: "Ekart", courierAWB: "EKT5432167890",
    deliveryAddress: "Flat 5B, Tower C, Oberoi Garden, Mumbai", pincode: "400063",
    weight: "7.2kg", date: "2024-01-13",
    expectedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    orderType: "Standard", status: "Processing", priority: "Normal", starred: false,
    notes: [{ text: "Large package - needs ground floor delivery", timestamp: "2024-01-13T14:00:00", by: "User" }],
    timeline: [
      { action: "Order created", timestamp: "2024-01-13T13:00:00", by: "User" },
    ],
  },
  {
    id: "ord_004", productName: "Nike Air Max 270", sku: "NIK-AM270-BLK-10",
    invoiceNumber: "INV-2024-0344", orderNumber: "ORD-2024-0344", amount: 12995,
    customerName: "Sneha Joshi", customerPhone: "9871234560",
    courierPartner: "DTDC", courierAWB: "DTC1122334455",
    deliveryAddress: "23, Park Street, New Delhi", pincode: "110001",
    weight: "850g", date: "2024-01-08", expectedDeliveryDate: "2024-01-12",
    orderType: "Return", status: "Processing", priority: "Normal", starred: false,
    notes: [{ text: "Wrong size delivered, customer wants exchange", timestamp: "2024-01-16T10:00:00", by: "User" }],
    timeline: [
      { action: "Return order created", timestamp: "2024-01-16T10:00:00", by: "User" },
    ],
  },
];

// ─── UTILS ─────────────────────────────────────────────────────────────────────

const genId = () => `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const fmtCurrency = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtTs = (ts) => new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const isOverdue = (order) => {
  if (!order.expectedDeliveryDate || order.status === "Delivered" || order.status === "Cancelled") return false;
  return new Date(order.expectedDeliveryDate) < new Date(new Date().toDateString());
};
const maskAWB = (awb) => awb ? awb.slice(0, 4) + "****" + awb.slice(-4) : "—";

// ─── TOAST ─────────────────────────────────────────────────────────────────────

const TOAST_ICONS = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️", delete: "🗑️", export: "📥", offline: "🔌", online: "🌐" };

function Toast({ toasts, remove }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl bg-slate-800 text-slate-100 border border-slate-700 text-sm font-medium min-w-64 max-w-xs animate-slide-in">
          <span>{TOAST_ICONS[t.type] || "ℹ️"}</span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-white"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── MODAL WRAPPER ──────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children, size = "max-w-2xl", dark }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${size} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── STATUS BADGE ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const colors = {
    Processing: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    Packed:     "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    Dispatched: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    Delivered:  "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    Cancelled:  "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

function TypeBadge({ type }) {
  const colors = {
    Standard: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    Return:   "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    Refund:   "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[type] || "bg-slate-100 text-slate-600"}`}>{type}</span>;
}

// ─── ORDER FORM ────────────────────────────────────────────────────────────────

function OrderForm({ initial, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_ORDER, ...initial }));
  const [newNote, setNewNote] = useState("");
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addNote = () => {
    if (!newNote.trim()) return;
    const entry = { text: newNote.trim(), timestamp: new Date().toISOString(), by: "User" };
    f("notes", [...(form.notes || []), entry]);
    setNewNote("");
  };

  const Field = ({ label, icon: Icon, children }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
        {Icon && <Icon size={11} />} {label}
      </label>
      {children}
    </div>
  );

  const inp = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400";
  const sel = inp + " cursor-pointer";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Product Name" icon={Package}><input className={inp} value={form.productName} onChange={e => f("productName", e.target.value)} placeholder="e.g. Sony WH-1000XM5" /></Field>
        <Field label="SKU" icon={Hash}><input className={inp} value={form.sku} onChange={e => f("sku", e.target.value)} placeholder="e.g. SON-WH-XM5-BLK" /></Field>
        <Field label="Invoice Number" icon={FileText}><input className={inp} value={form.invoiceNumber} onChange={e => f("invoiceNumber", e.target.value)} placeholder="INV-2024-XXXX" /></Field>
        <Field label="Order Number" icon={Hash}><input className={inp} value={form.orderNumber} onChange={e => f("orderNumber", e.target.value)} placeholder="ORD-2024-XXXX" /></Field>
        <Field label="Amount (₹)" icon={CreditCard}><input className={inp} type="number" value={form.amount} onChange={e => f("amount", e.target.value)} placeholder="0" /></Field>
        <Field label="Weight" icon={Weight}><input className={inp} value={form.weight} onChange={e => f("weight", e.target.value)} placeholder="e.g. 500g" /></Field>
      </div>
      <div className="border-t border-slate-100 dark:border-slate-700 pt-4 grid grid-cols-2 gap-4">
        <Field label="Customer Name" icon={User}><input className={inp} value={form.customerName} onChange={e => f("customerName", e.target.value)} placeholder="Full name" /></Field>
        <Field label="Customer Phone (optional)" icon={Phone}><input className={inp} value={form.customerPhone} onChange={e => f("customerPhone", e.target.value)} placeholder="10-digit number" /></Field>
      </div>
      <Field label="Delivery Address" icon={MapPin}>
        <textarea className={inp + " resize-none"} rows={2} value={form.deliveryAddress} onChange={e => f("deliveryAddress", e.target.value)} placeholder="Full delivery address" />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Pincode"><input className={inp} value={form.pincode} onChange={e => f("pincode", e.target.value)} placeholder="6-digit" /></Field>
        <Field label="Courier Partner" icon={Truck}>
          <select className={sel} value={form.courierPartner} onChange={e => f("courierPartner", e.target.value)}>
            {COURIERS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Courier AWB"><input className={inp} value={form.courierAWB} onChange={e => f("courierAWB", e.target.value)} placeholder="AWB number" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Order Date" icon={Calendar}><input className={inp} type="date" value={form.date} onChange={e => f("date", e.target.value)} /></Field>
        <Field label="Expected Delivery" icon={Calendar}><input className={inp} type="date" value={form.expectedDeliveryDate} onChange={e => f("expectedDeliveryDate", e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Order Type">
          <select className={sel} value={form.orderType} onChange={e => f("orderType", e.target.value)}>
            {ORDER_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Order Status">
          <select className={sel} value={form.status} onChange={e => f("status", e.target.value)}>
            {ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className={sel} value={form.priority} onChange={e => f("priority", e.target.value)}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </Field>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Notes / Comments</label>
        <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
          {(form.notes || []).map((n, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm">
              <p className="text-slate-900 dark:text-white">{n.text}</p>
              <p className="text-xs text-slate-400 mt-0.5">{fmtTs(n.timestamp)} · {n.by}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className={inp + " flex-1"} value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} placeholder="Add a note..." />
          <button onClick={addNote} className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold">Add</button>
        </div>
      </div>
      <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
        <button onClick={() => onSave(form)} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors">
          {isEdit ? "Save Changes" : "Add Order"}
        </button>
        <button onClick={onCancel} className="px-6 py-2.5 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ─── PDF UPLOAD ────────────────────────────────────────────────────────────────

function PDFUploader({ onParsed, existingOrders, addToast, onClose }) {
  const [files, setFiles] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [reviewModal, setReviewModal] = useState(null);
  const [dupWarning, setDupWarning] = useState(null);
  const dropRef = useRef();
  const fileRef = useRef();

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const handleFiles = (newFiles) => {
    const pdfs = Array.from(newFiles).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (!pdfs.length) { addToast("Please upload PDF files only", "error"); return; }
    const items = pdfs.map(f => ({ file: f, name: f.name, status: "pending", result: null, error: null, progress: 0 }));
    setQueue(items);
    setFiles(pdfs);
  };

  const startParsing = async () => {
    if (!queue.length) return;
    setParsing(true);
    let updated = [...queue];
    for (let i = 0; i < updated.length; i++) {
      setCurrentIdx(i);
      updated[i] = { ...updated[i], status: "parsing", progress: 30 };
      setQueue([...updated]);
      try {
        const b64 = await toBase64(updated[i].file);
        updated[i] = { ...updated[i], progress: 60 };
        setQueue([...updated]);
        // ── Google Gemini 1.5 Flash (per tech_stack.md) ──
        const apiKey = window._GEMINI_API_KEY || prompt("Enter your Google Gemini API key:");
        if (apiKey) window._GEMINI_API_KEY = apiKey;
        if (!apiKey) throw new Error("No API key provided");
        const prompt_text = `You are a shipping label parser. Extract ALL fields from the PDF shipping label exactly as they appear. Return ONLY valid JSON, no markdown, no explanation. Fields: { productName, sku, invoiceNumber, orderNumber, amount, customerName, courierPartner, courierAWB, deliveryAddress, pincode, weight, date, expectedDeliveryDate }. Use null for missing fields. Dates should be in YYYY-MM-DD format. amount should be a number only.`;
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [
              { inline_data: { mime_type: "application/pdf", data: b64 } },
              { text: prompt_text }
            ] }],
            generationConfig: { temperature: 0, maxOutputTokens: 1024 },
          }),
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message);
        const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        updated[i] = { ...updated[i], status: "done", progress: 100, result: parsed };
        setQueue([...updated]);
        // show review modal for this file
        setReviewModal({ fileIdx: i, data: parsed, fileName: updated[i].name });
      } catch (err) {
        updated[i] = { ...updated[i], status: "failed", progress: 100, error: err.message };
        setQueue([...updated]);
        addToast(`Failed to parse ${updated[i].name}`, "error");
      }
      // small delay between files
      if (i < updated.length - 1) await new Promise(r => setTimeout(r, 800));
    }
    setParsing(false);
    setCurrentIdx(-1);
  };

  const handleReviewSave = (formData) => {
    const dup = existingOrders.find(o =>
      (formData.orderNumber && o.orderNumber === formData.orderNumber) ||
      (formData.courierAWB && o.courierAWB === formData.courierAWB)
    );
    if (dup) {
      setDupWarning({ formData, dupOrder: dup });
      setReviewModal(null);
    } else {
      onParsed(formData, "new");
      setReviewModal(null);
      addToast("Order added from PDF ✅", "success");
    }
  };

  const handleDup = (action) => {
    if (action === "update") onParsed(dupWarning.formData, "update", dupWarning.dupOrder.id);
    else if (action === "new") onParsed(dupWarning.formData, "new");
    setDupWarning(null);
  };

  const statusColor = { pending: "bg-slate-200", parsing: "bg-amber-400", done: "bg-green-400", failed: "bg-red-400" };
  const statusLabel = { pending: "Waiting", parsing: "Parsing…", done: "Done ✓", failed: "Failed" };

  return (
    <div className="space-y-5">
      {/* Drop Zone */}
      <div
        ref={dropRef}
        onDragOver={e => { e.preventDefault(); dropRef.current.classList.add("border-amber-400", "bg-amber-50", "dark:bg-amber-900/10"); }}
        onDragLeave={() => { dropRef.current.classList.remove("border-amber-400", "bg-amber-50", "dark:bg-amber-900/10"); }}
        onDrop={e => { e.preventDefault(); dropRef.current.classList.remove("border-amber-400", "bg-amber-50", "dark:bg-amber-900/10"); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-10 text-center cursor-pointer transition-all"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="mx-auto mb-3 text-slate-400" size={36} />
        <p className="font-semibold text-slate-700 dark:text-slate-200">Drop PDF shipping labels here</p>
        <p className="text-sm text-slate-400 mt-1">or click to browse · Multiple files supported</p>
        <input ref={fileRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* File Queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {parsing && currentIdx >= 0 && (
            <div className="text-sm text-amber-600 dark:text-amber-400 font-semibold">
              Parsing {currentIdx + 1} of {queue.length} labels…
            </div>
          )}
          {queue.map((item, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-xs">{item.name}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === "done" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : item.status === "failed" ? "bg-red-100 text-red-700" : item.status === "parsing" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500 dark:bg-slate-700"}`}>
                  {statusLabel[item.status]}
                </span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${statusColor[item.status]}`} style={{ width: `${item.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {queue.length > 0 && !parsing && queue.some(q => q.status === "pending") && (
        <button onClick={startParsing} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
          <Zap size={16} /> Parse {queue.length} PDF{queue.length > 1 ? "s" : ""}
        </button>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <Modal open size="max-w-3xl" title={`Review Parsed Order — ${reviewModal.fileName}`} onClose={() => setReviewModal(null)}>
          <OrderForm
            initial={{ ...EMPTY_ORDER, ...reviewModal.data }}
            onSave={handleReviewSave}
            onCancel={() => setReviewModal(null)}
          />
        </Modal>
      )}

      {/* Duplicate Warning */}
      {dupWarning && (
        <Modal open size="max-w-md" title="⚠️ Duplicate Order Detected" onClose={() => setDupWarning(null)}>
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
              An order with the same Order Number or AWB already exists (<strong>{dupWarning.dupOrder.orderNumber}</strong>). What would you like to do?
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleDup("update")} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm">Update Existing</button>
              <button onClick={() => handleDup("new")} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm">Add as New</button>
              <button onClick={() => setDupWarning(null)} className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-600 dark:text-slate-300">Discard</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── ORDER DETAIL MODAL ────────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose, onEdit, onDelete, onStatusChange, addNote, onToggleStar }) {
  const [newNote, setNewNote] = useState("");
  const trackUrl = COURIER_TRACKING[order.courierPartner]?.(order.courierAWB);
  const overdue = isOverdue(order);

  const STATUS_STEPS = ["Processing", "Packed", "Dispatched", "Delivered"];
  const curStep = STATUS_STEPS.indexOf(order.status);

  const submitNote = () => {
    if (!newNote.trim()) return;
    addNote(order.id, newNote.trim());
    setNewNote("");
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}#/track/${order.orderNumber}`;

  return (
    <Modal open onClose={onClose} title={`Order ${order.orderNumber}`} size="max-w-3xl">
      <div className="space-y-6">
        {overdue && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2"><AlertCircle size={15} /> This order is overdue!</div>}

        {/* Status stepper */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <div className="flex items-center">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex flex-col items-center ${i < STATUS_STEPS.length - 1 ? "flex-1" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                    ${i < curStep ? "bg-green-500 border-green-500 text-white" :
                      i === curStep ? "bg-amber-500 border-amber-500 text-white" :
                      "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400"}`}>
                    {i < curStep ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${i <= curStep ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}`}>{s}</span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mb-4 ${i < curStep ? "bg-green-400" : "bg-slate-200 dark:bg-slate-600"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ["Product", order.productName], ["SKU", order.sku],
            ["Invoice", order.invoiceNumber], ["Amount", fmtCurrency(order.amount)],
            ["Customer", order.customerName], ["Phone", order.customerPhone || "—"],
            ["Courier", order.courierPartner], ["AWB", order.courierAWB],
            ["Pincode", order.pincode], ["Weight", order.weight],
            ["Order Date", fmtDate(order.date)], ["Expected Delivery", fmtDate(order.expectedDeliveryDate)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-slate-400 text-xs font-semibold">{k}</p>
              <p className="text-slate-900 dark:text-white font-medium">{v}</p>
            </div>
          ))}
          <div className="col-span-2">
            <p className="text-slate-400 text-xs font-semibold">Delivery Address</p>
            <p className="text-slate-900 dark:text-white font-medium">{order.deliveryAddress}</p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <StatusBadge status={order.status} />
          <TypeBadge type={order.orderType} />
          {order.priority === "Urgent" && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">🔴 Urgent</span>}
          {order.starred && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">⭐ Starred</span>}
        </div>

        {trackUrl && (
          <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-semibold">
            <ExternalLink size={14} /> Track on {order.courierPartner}
          </a>
        )}

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"><Clock size={14} /> Timeline</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {[...(order.timeline || [])].reverse().map((t, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <div>
                  <span className="text-slate-900 dark:text-white">{t.action}</span>
                  <span className="text-slate-400 text-xs ml-2">{fmtTs(t.timestamp)} · {t.by}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Comments</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
            {(order.notes || []).map((n, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                <p className="text-sm text-slate-900 dark:text-white">{n.text}</p>
                <p className="text-xs text-slate-400 mt-0.5">{fmtTs(n.timestamp)} · {n.by}</p>
              </div>
            ))}
            {!(order.notes?.length) && <p className="text-sm text-slate-400">No comments yet.</p>}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === "Enter" && submitNote()} placeholder="Add a comment…" />
            <button onClick={submitNote} className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold">Add</button>
          </div>
        </div>

        {/* Share */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex items-center gap-3">
          <Share2 size={14} className="text-slate-400" />
          <input readOnly value={shareUrl} className="flex-1 text-xs bg-transparent text-slate-500 dark:text-slate-400 font-mono" />
          <button onClick={() => { navigator.clipboard?.writeText(shareUrl); }} className="text-xs text-amber-600 font-semibold hover:text-amber-700">Copy</button>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onEdit} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Edit size={14} /> Edit</button>
          <button onClick={() => onToggleStar(order.id)} className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
            {order.starred ? "★ Unstar" : "☆ Star"}
          </button>
          <button onClick={() => { if (window.confirm("Delete this order?")) onDelete(order.id); onClose(); }} className="px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl font-semibold text-sm flex items-center gap-2">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── TRACKING PAGE ─────────────────────────────────────────────────────────────

function TrackingPage({ orderNumber, orders, onBack }) {
  const order = orders.find(o => o.orderNumber === orderNumber);
  const STATUS_STEPS = ["Processing", "Packed", "Dispatched", "Delivered"];
  const curStep = order ? STATUS_STEPS.indexOf(order.status) : -1;

  if (!order) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
      <div className="text-center">
        <Package className="mx-auto mb-4 text-slate-300" size={64} />
        <h2 className="text-xl font-bold text-slate-700 dark:text-white mb-2">Order Not Found</h2>
        <p className="text-slate-400 mb-6">No order found with number: {orderNumber}</p>
        <button onClick={onBack} className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-bold">← Back to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-1">
            <Package size={20} />
            <span className="text-sm font-semibold opacity-80">ORDER TRACKING</span>
          </div>
          <h1 className="text-2xl font-black font-mono">{order.orderNumber}</h1>
          <p className="text-amber-100 text-sm mt-1">{order.productName}</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Stepper */}
          <div>
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 flex-shrink-0
                    ${i < curStep ? "bg-green-500 border-green-500 text-white" :
                      i === curStep ? "bg-amber-500 border-amber-500 text-white animate-pulse" :
                      "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400"}`}>
                    {i < curStep ? "✓" : i + 1}
                  </div>
                  {i < STATUS_STEPS.length - 1 && <div className={`w-0.5 h-8 mt-1 ${i < curStep ? "bg-green-400" : "bg-slate-200 dark:bg-slate-600"}`} />}
                </div>
                <div className="pt-1 pb-6">
                  <p className={`font-semibold ${i <= curStep ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>{s}</p>
                  {i === curStep && <p className="text-xs text-amber-500 font-semibold">Current Status</p>}
                </div>
              </div>
            ))}
          </div>
          {/* Info */}
          <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
            {[
              ["Customer", order.customerName],
              ["Courier", `${order.courierPartner} · AWB: ${maskAWB(order.courierAWB)}`],
              ["Expected Delivery", fmtDate(order.expectedDeliveryDate)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-400">{k}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{v}</span>
              </div>
            ))}
          </div>
          <button onClick={onBack} className="w-full py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2">
            <Home size={14} /> Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KEYBOARD SHORTCUTS MODAL ─────────────────────────────────────────────────

function ShortcutsModal({ onClose }) {
  return (
    <Modal open onClose={onClose} title="⌨️ Keyboard Shortcuts" size="max-w-md">
      <div className="space-y-2">
        {[
          ["/", "Focus search bar"],
          ["N", "New order"],
          ["U", "Upload PDF"],
          ["Escape", "Close modal"],
          ["?", "Show shortcuts"],
          ["Shift+Click header", "Multi-column sort"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <span className="text-sm text-slate-600 dark:text-slate-300">{v}</span>
            <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded text-xs font-mono font-bold">{k}</kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── PRINT INVOICE ─────────────────────────────────────────────────────────────

function PrintInvoice({ order, onClose }) {
  return (
    <Modal open onClose={onClose} title="Print Invoice" size="max-w-2xl">
      <div id="print-area" className="bg-white text-slate-900 p-8 border border-slate-200 rounded-xl">
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div>
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mb-3">
              <Package className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-black text-slate-900">INVOICE</h1>
            <p className="text-slate-400 text-sm">#{order.invoiceNumber}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">Order Date: {fmtDate(order.date)}</p>
            <p className="text-slate-500">Order No: {order.orderNumber}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Bill To</p>
            <p className="font-bold text-slate-900">{order.customerName}</p>
            <p className="text-slate-500 text-sm">{order.deliveryAddress}</p>
            <p className="text-slate-500 text-sm">Pin: {order.pincode}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Shipping</p>
            <p className="font-bold text-slate-900">{order.courierPartner}</p>
            <p className="text-slate-500 text-sm">AWB: {order.courierAWB}</p>
          </div>
        </div>
        <table className="w-full text-sm border-collapse mb-8">
          <thead><tr className="bg-slate-50"><th className="text-left p-3 border border-slate-200">Product</th><th className="text-left p-3 border border-slate-200">SKU</th><th className="text-right p-3 border border-slate-200">Amount</th></tr></thead>
          <tbody><tr><td className="p-3 border border-slate-200">{order.productName}</td><td className="p-3 border border-slate-200 font-mono text-xs">{order.sku}</td><td className="p-3 border border-slate-200 text-right font-bold">{fmtCurrency(order.amount)}</td></tr></tbody>
          <tfoot><tr><td colSpan={2} className="p-3 border border-slate-200 font-bold">Total</td><td className="p-3 border border-slate-200 text-right font-black text-lg">{fmtCurrency(order.amount)}</td></tr></tfoot>
        </table>
        <div className="flex justify-between items-end mt-12">
          <p className="text-xs text-slate-400">Generated by Sales Tracker</p>
          <div className="text-right">
            <div className="w-32 border-t border-slate-900 pt-2 text-xs text-slate-500">Authorized Signature</div>
          </div>
        </div>
      </div>
      <button onClick={() => window.print()} className="mt-4 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Printer size={16} /> Print Invoice</button>
    </Modal>
  );
}

// ─── PACKING SLIP ──────────────────────────────────────────────────────────────

function PackingSlip({ order, onClose }) {
  return (
    <Modal open onClose={onClose} title="Packing Slip" size="max-w-md">
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4 text-sm">
        <div className="flex items-center gap-3 pb-3 border-b border-dashed border-slate-300 dark:border-slate-600">
          <Package className="text-amber-500" size={20} />
          <div><p className="font-black text-lg">PACKING SLIP</p><p className="text-slate-400 text-xs">A5 Print Format</p></div>
        </div>
        {[
          ["Order No.", order.orderNumber], ["Customer", order.customerName],
          ["Product", order.productName], ["SKU", order.sku],
          ["AWB", order.courierAWB], ["Courier", order.courierPartner],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-slate-400 font-semibold">{k}</span>
            <span className="font-bold text-right max-w-xs">{v}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-slate-300 dark:border-slate-600 pt-3">
          <p className="text-slate-400 font-semibold mb-1">Delivery Address</p>
          <p className="font-medium">{order.deliveryAddress}, {order.pincode}</p>
        </div>
      </div>
      <button onClick={() => window.print()} className="mt-4 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Printer size={16} /> Print Slip</button>
    </Modal>
  );
}

// ─── DASHBOARD CARDS ───────────────────────────────────────────────────────────

function DashboardCards({ orders, onFilter }) {
  const today = new Date().toDateString();
  const stats = useMemo(() => {
    const total = orders.length;
    const revenue = orders.filter(o => o.orderType === "Standard" || o.orderType === "Refund").reduce((s, o) => s + Number(o.amount || 0), 0);
    const dispatched = orders.filter(o => o.status === "Dispatched").length;
    const delivered = orders.filter(o => o.status === "Delivered").length;
    const pending = orders.filter(o => o.status === "Processing" || o.status === "Packed").length;
    const overdue = orders.filter(isOverdue).length;
    const returns = orders.filter(o => o.orderType === "Return").length;
    const refunds = orders.filter(o => o.orderType === "Refund").length;
    return { total, revenue, dispatched, delivered, pending, overdue, returns, refunds };
  }, [orders]);

  const cards = [
    { label: "Total Orders", value: stats.total, icon: Package, color: "from-slate-700 to-slate-800", filter: {} },
    { label: "Total Revenue", value: fmtCurrency(stats.revenue), icon: TrendingUp, color: "from-amber-500 to-orange-500", filter: {} },
    { label: "Dispatched", value: stats.dispatched, icon: Truck, color: "from-purple-600 to-purple-700", filter: { status: ["Dispatched"] } },
    { label: "Delivered", value: stats.delivered, icon: CheckCircle, color: "from-green-600 to-green-700", filter: { status: ["Delivered"] } },
    { label: "Pending", value: stats.pending, icon: Clock, color: "from-blue-600 to-blue-700", filter: { status: ["Processing", "Packed"] } },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "from-red-600 to-red-700", filter: { overdueOnly: true } },
    { label: "Returns", value: stats.returns, icon: RotateCcw, color: "from-orange-500 to-orange-600", filter: { orderType: ["Return"] } },
    { label: "Refunds", value: stats.refunds, icon: RefreshCw, color: "from-pink-500 to-pink-600", filter: { orderType: ["Refund"] } },
  ];

  const maxVal = Math.max(stats.total, 1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map(c => {
        const rawNum = typeof c.value === "number" ? c.value : (typeof stats[c.label.toLowerCase().replace(/ /g,"")] === "number" ? stats[c.label.toLowerCase().replace(/ /g,"")] : null);
        const barPct = rawNum !== null ? Math.min(100, Math.round((rawNum / maxVal) * 100)) : null;
        return (
          <button key={c.label} onClick={() => onFilter(c.filter)} className={`bg-gradient-to-br ${c.color} text-white rounded-2xl p-4 text-left hover:scale-105 transition-transform shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <c.icon size={18} className="opacity-80" />
            </div>
            <p className="text-2xl font-black">{c.value}</p>
            <p className="text-xs opacity-70 font-semibold mt-0.5">{c.label}</p>
            {barPct !== null && (
              <div className="mt-2.5 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/60 rounded-full transition-all duration-700"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── FILTER PANEL ──────────────────────────────────────────────────────────────

function FilterPanel({ filters, setFilters, presets, onSavePreset, onDeletePreset, onApplyPreset }) {
  const [open, setOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showPresetInput, setShowPresetInput] = useState(false);

  const toggle = (key, val) => {
    const arr = filters[key] || [];
    setFilters(p => ({ ...p, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }));
  };

  return (
    <div className="mb-4">
      {/* Preset chips */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {presets.map(p => (
            <div key={p.name} className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full px-3 py-1 text-xs font-semibold">
              <button onClick={() => onApplyPreset(p)}>{p.name}</button>
              <button onClick={() => onDeletePreset(p.name)} className="ml-1 hover:text-red-500"><X size={10} /></button>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors">
        <Filter size={15} /> Filters {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {Object.values(filters).some(v => v?.length > 0 || v === true) && <span className="w-2 h-2 rounded-full bg-amber-500" />}
      </button>

      {open && (
        <div className="mt-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-3 gap-5">
          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">Status</p>
            {ORDER_STATUSES.map(s => (
              <label key={s} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 mb-1 cursor-pointer">
                <input type="checkbox" checked={(filters.status || []).includes(s)} onChange={() => toggle("status", s)} className="accent-amber-500" /> {s}
              </label>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">Order Type</p>
            {ORDER_TYPES.map(t => (
              <label key={t} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 mb-1 cursor-pointer">
                <input type="checkbox" checked={(filters.orderType || []).includes(t)} onChange={() => toggle("orderType", t)} className="accent-amber-500" /> {t}
              </label>
            ))}
            <p className="text-xs font-bold text-slate-400 mt-3 mb-2">Courier</p>
            {COURIERS.map(c => (
              <label key={c} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 mb-1 cursor-pointer">
                <input type="checkbox" checked={(filters.courier || []).includes(c)} onChange={() => toggle("courier", c)} className="accent-amber-500" /> {c}
              </label>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">Date Range</p>
            <div className="flex flex-col gap-1.5">
              {["Today", "This Week", "This Month", "Custom"].map(r => (
                <button key={r} onClick={() => setFilters(p => ({ ...p, dateRange: r }))} className={`text-left text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${filters.dateRange === r ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"}`}>{r}</button>
              ))}
            </div>
            {filters.dateRange === "Custom" && (
              <div className="mt-2 space-y-1">
                <input type="date" value={filters.dateFrom || ""} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                <input type="date" value={filters.dateTo || ""} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              </div>
            )}
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={!!filters.overdueOnly} onChange={e => setFilters(p => ({ ...p, overdueOnly: e.target.checked }))} className="accent-amber-500" /> Overdue Only
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={!!filters.starredOnly} onChange={e => setFilters(p => ({ ...p, starredOnly: e.target.checked }))} className="accent-amber-500" /> Starred Only
              </label>
            </div>
          </div>

          {/* Amount Range Slider */}
          <div className="col-span-2 sm:col-span-3 border-t border-slate-100 dark:border-slate-700 pt-4">
            <p className="text-xs font-bold text-slate-400 mb-3">Amount Range (₹)</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400 mb-1">Min</label>
                <input
                  type="range" min={0} max={100000} step={500}
                  value={filters.amountMin ?? 0}
                  onChange={e => setFilters(p => ({ ...p, amountMin: Number(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>₹0</span>
                  <span className="font-semibold text-amber-600">₹{(filters.amountMin ?? 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400 mb-1">Max</label>
                <input
                  type="range" min={0} max={100000} step={500}
                  value={filters.amountMax ?? 100000}
                  onChange={e => setFilters(p => ({ ...p, amountMax: Number(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>₹0</span>
                  <span className="font-semibold text-amber-600">{(filters.amountMax ?? 100000) >= 100000 ? "₹1,00,000+" : `₹${(filters.amountMax ?? 100000).toLocaleString("en-IN")}`}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-3 flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            {showPresetInput ? (
              <>
                <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Preset name" className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <button onClick={() => { onSavePreset(presetName); setPresetName(""); setShowPresetInput(false); }} className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg font-semibold">Save</button>
                <button onClick={() => setShowPresetInput(false)} className="text-sm text-slate-400 hover:text-slate-600">Cancel</button>
              </>
            ) : (
              <button onClick={() => setShowPresetInput(true)} className="text-sm text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"><Bookmark size={13} /> Save as Preset</button>
            )}
            <button onClick={() => setFilters({})} className="ml-auto text-sm text-slate-400 hover:text-red-500">Clear Filters</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const [orders, setOrders] = useState(() => {
    try { const s = localStorage.getItem("salestracker_orders"); return s ? JSON.parse(s) : SAMPLE_ORDERS; }
    catch { return SAMPLE_ORDERS; }
  });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("salestracker_darkmode") === "true");
  const [presets, setPresets] = useState(() => { try { return JSON.parse(localStorage.getItem("salestracker_presets") || "[]"); } catch { return []; } });
  const [searchQ, setSearchQ] = useState("");
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState([{ col: "date", dir: "desc" }]);
  const [selected, setSelected] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null); // { type, data }
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trackingId, setTrackingId] = useState(null);
  const searchRef = useRef();

  // ── Persist ──────────────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("salestracker_orders", JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem("salestracker_darkmode", darkMode); document.documentElement.classList.toggle("dark", darkMode); }, [darkMode]);
  useEffect(() => { localStorage.setItem("salestracker_presets", JSON.stringify(presets)); }, [presets]);

  // ── Online/offline ────────────────────────────────────────────────────────────
  useEffect(() => {
    const on = () => { setIsOnline(true); addToast("You're back online 🌐", "online"); };
    const off = () => { setIsOnline(false); addToast("You are offline 🔌", "offline"); };
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // ── Hash routing ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const h = window.location.hash;
      if (h.startsWith("#/track/")) setTrackingId(decodeURIComponent(h.slice(8)));
      else setTrackingId(null);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setModal({ type: "newOrder" }); }
      if (e.key === "u" || e.key === "U") { e.preventDefault(); setModal({ type: "upload" }); }
      if (e.key === "?" || e.key === "Escape") {
        if (e.key === "?") setModal({ type: "shortcuts" });
        if (e.key === "Escape") setModal(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = "info") => {
    const id = genId();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  // ── Order CRUD ────────────────────────────────────────────────────────────────
  const addOrder = useCallback((form, isEdit = false, editId = null) => {
    const ts = new Date().toISOString();
    if (isEdit && editId) {
      setOrders(p => p.map(o => o.id === editId ? {
        ...o, ...form,
        timeline: [...(o.timeline || []), { action: "Order edited", timestamp: ts, by: "User" }],
      } : o));
      addToast("Order updated ✅", "success");
    } else {
      const newOrder = {
        ...EMPTY_ORDER, ...form,
        id: genId(),
        starred: form.priority === "Starred",
        timeline: [{ action: "Order created", timestamp: ts, by: "User" }],
      };
      setOrders(p => [newOrder, ...p]);
      addToast("Order added ✅", "success");
    }
    setModal(null);
  }, [addToast]);

  const deleteOrder = useCallback((id) => {
    setOrders(p => p.filter(o => o.id !== id));
    setSelected(p => { const n = new Set(p); n.delete(id); return n; });
    addToast("Order deleted 🗑️", "delete");
  }, [addToast]);

  const updateStatus = useCallback((ids, newStatus) => {
    const ts = new Date().toISOString();
    setOrders(p => p.map(o => ids.includes(o.id) ? {
      ...o, status: newStatus,
      timeline: [...(o.timeline || []), { action: `Status → ${newStatus}`, timestamp: ts, by: "User" }],
    } : o));
    addToast(`Status updated to ${newStatus} ✅`, "success");
  }, [addToast]);

  const addNote = useCallback((id, text) => {
    const entry = { text, timestamp: new Date().toISOString(), by: "User" };
    setOrders(p => p.map(o => o.id === id ? { ...o, notes: [...(o.notes || []), entry], timeline: [...(o.timeline || []), { action: `Note added: "${text.slice(0, 30)}…"`, timestamp: entry.timestamp, by: "User" }] } : o));
  }, []);

  const toggleStar = useCallback((id) => {
    setOrders(p => p.map(o => o.id === id ? { ...o, starred: !o.starred } : o));
  }, []);

  const handleParsed = useCallback((formData, action, existingId) => {
    if (action === "update" && existingId) {
      addOrder(formData, true, existingId);
    } else {
      addOrder(formData, false);
    }
  }, [addOrder]);

  // ── Filtering & sorting ───────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let result = [...orders];
    const today = new Date().toDateString();

    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter(o =>
        [o.customerName, o.orderNumber, o.courierAWB, o.sku, o.productName, o.pincode]
          .some(f => f?.toLowerCase().includes(q))
      );
    }
    if (filters.status?.length) result = result.filter(o => filters.status.includes(o.status));
    if (filters.orderType?.length) result = result.filter(o => filters.orderType.includes(o.orderType));
    if (filters.courier?.length) result = result.filter(o => filters.courier.includes(o.courierPartner));
    if (filters.overdueOnly) result = result.filter(isOverdue);
    if (filters.starredOnly) result = result.filter(o => o.starred);
    // Amount range filter
    if (filters.amountMin != null && filters.amountMin > 0) result = result.filter(o => Number(o.amount) >= filters.amountMin);
    if (filters.amountMax != null && filters.amountMax < 100000) result = result.filter(o => Number(o.amount) <= filters.amountMax);
    if (filters.dateRange === "Today") result = result.filter(o => new Date(o.date).toDateString() === today);
    if (filters.dateRange === "This Week") {
      const d = new Date(); d.setDate(d.getDate() - 7);
      result = result.filter(o => new Date(o.date) >= d);
    }
    if (filters.dateRange === "This Month") {
      const d = new Date(); d.setDate(1);
      result = result.filter(o => new Date(o.date) >= d);
    }
    if (filters.dateRange === "Custom") {
      if (filters.dateFrom) result = result.filter(o => o.date >= filters.dateFrom);
      if (filters.dateTo) result = result.filter(o => o.date <= filters.dateTo);
    }

    // Sort: starred always first, then multi-column sort
    result.sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      for (const { col, dir } of sortConfig) {
        const va = a[col] ?? ""; const vb = b[col] ?? "";
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });

    return result;
  }, [orders, searchQ, filters, sortConfig]);

  const handleSort = useCallback((col, isShift) => {
    setSortConfig(prev => {
      if (isShift) {
        const idx = prev.findIndex(s => s.col === col);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { col, dir: copy[idx].dir === "asc" ? "desc" : "asc" };
          return copy;
        }
        return [...prev, { col, dir: "asc" }];
      }
      const cur = prev.find(s => s.col === col);
      return [{ col, dir: cur?.dir === "asc" ? "desc" : "asc" }];
    });
  }, []);

  // ── Bulk actions ──────────────────────────────────────────────────────────────
  const selectedArr = useMemo(() => [...selected], [selected]);
  const [bulkStatus, setBulkStatus] = useState("");

  const applyBulkStatus = () => {
    if (!bulkStatus || !selectedArr.length) return;
    updateStatus(selectedArr, bulkStatus);
    setSelected(new Set());
    setBulkStatus("");
  };

  const bulkDelete = () => {
    if (!window.confirm(`Delete ${selectedArr.length} order(s)?`)) return;
    setOrders(p => p.filter(o => !selected.has(o.id)));
    setSelected(new Set());
    addToast(`${selectedArr.length} orders deleted 🗑️`, "delete");
  };

  const bulkStar = () => {
    setOrders(p => p.map(o => selected.has(o.id) ? { ...o, starred: true } : o));
    setSelected(new Set());
  };

  // ── Export ────────────────────────────────────────────────────────────────────
  const exportCSV = (data, filename = "orders.csv") => {
    const cols = ["orderNumber","customerName","productName","sku","amount","status","orderType","courierPartner","courierAWB","date","expectedDeliveryDate","pincode","invoiceNumber"];
    const header = cols.join(",");
    const rows = data.map(o => cols.map(c => `"${(o[c] ?? "").toString().replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    addToast("CSV exported 📥", "export");
  };

  const exportExcel = async (data) => {
    addToast("Preparing Excel export…", "info");
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
      const ws = XLSX.utils.json_to_sheet(data.map(o => ({
        "Order No.": o.orderNumber, "Customer": o.customerName, "Product": o.productName,
        "SKU": o.sku, "Amount (₹)": o.amount, "Status": o.status, "Type": o.orderType,
        "Courier": o.courierPartner, "AWB": o.courierAWB, "Date": o.date,
        "Expected Delivery": o.expectedDeliveryDate, "Pincode": o.pincode,
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");
      XLSX.writeFile(wb, "orders.xlsx");
      addToast("Excel exported 📥", "export");
    } catch (e) { addToast("Excel export failed", "error"); }
  };

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // ── Presets ───────────────────────────────────────────────────────────────────
  const savePreset = (name) => {
    if (!name.trim()) return;
    setPresets(p => [...p.filter(x => x.name !== name), { name: name.trim(), filters: { ...filters } }]);
    addToast(`Preset "${name}" saved ✅`, "success");
  };
  const deletePreset = (name) => setPresets(p => p.filter(x => x.name !== name));
  const applyPreset = (p) => setFilters({ ...p.filters });

  // ── Column sort indicator ─────────────────────────────────────────────────────
  const SortIcon = ({ col }) => {
    const s = sortConfig.find(x => x.col === col);
    if (!s) return <ArrowUp size={11} className="text-slate-300 dark:text-slate-600" />;
    return s.dir === "asc" ? <ArrowUp size={11} className="text-amber-500" /> : <ArrowDown size={11} className="text-amber-500" />;
  };

  const ThSort = ({ col, label, className = "" }) => (
    <th onClick={(e) => handleSort(col, e.shiftKey)} className={`px-3 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-amber-500 select-none whitespace-nowrap ${className}`}>
      <div className="flex items-center gap-1">{label}<SortIcon col={col} /></div>
    </th>
  );

  // ── Tracking page ─────────────────────────────────────────────────────────────
  if (trackingId) {
    return (
      <div className={darkMode ? "dark" : ""}>
        <TrackingPage orderNumber={trackingId} orders={orders} onBack={() => { window.location.hash = ""; }} />
      </div>
    );
  }

  const activeOrder = modal?.type === "view" || modal?.type === "edit" ? orders.find(o => o.id === modal.data) : null;
  const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => selected.has(o.id));

  return (
    <div className={darkMode ? "dark" : ""}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace !important; }
        @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in 0.25s ease; }
        @media print { .no-print { display: none !important; } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 9999px; }
      `}</style>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">

        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-red-600 text-white text-center text-sm py-2 font-semibold flex items-center justify-center gap-2 no-print">
            <WifiOff size={14} /> You are offline — all changes are saved locally
          </div>
        )}

        {/* Navbar */}
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 no-print">
          <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="sm:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Package className="text-white" size={16} />
                </div>
                <div>
                  <h1 className="font-black text-base leading-none text-slate-900 dark:text-white">SalesTracker</h1>
                  <p className="text-[10px] text-slate-400 leading-none font-mono">ORDER MANAGEMENT</p>
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-sm hidden sm:block">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input ref={searchRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder='Search orders… (press "/" to focus)'
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-slate-400" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setModal({ type: "upload" })} className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <Upload size={15} /> Upload PDF
              </button>
              <button onClick={() => setModal({ type: "newOrder" })} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                <Plus size={15} /> New Order
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => setModal({ type: "shortcuts" })} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hidden sm:block">
                <Keyboard size={18} />
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="sm:hidden px-4 pb-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input ref={searchRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search orders…"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
        </nav>

        {/* Main content */}
        <div className="max-w-screen-2xl mx-auto px-4 py-6">
          {/* Dashboard Cards */}
          <DashboardCards orders={orders} onFilter={(f) => setFilters(f)} />

          {/* Filter panel */}
          <FilterPanel filters={filters} setFilters={setFilters} presets={presets} onSavePreset={savePreset} onDeletePreset={deletePreset} onApplyPreset={applyPreset} />

          {/* Table header */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <h2 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
              {searchQ && ` for "${searchQ}"`}
            </h2>
            <div className="relative">
              <button onClick={() => setExportMenuOpen(!exportMenuOpen)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl transition-colors">
                <Download size={14} /> Export <ChevronDown size={12} />
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 w-52 overflow-hidden">
                  {[
                    ["Export All to CSV", () => exportCSV(orders, "all-orders.csv")],
                    ["Export Filtered to CSV", () => exportCSV(filteredOrders, "filtered-orders.csv")],
                    ["Export to Excel (.xlsx)", () => exportExcel(filteredOrders)],
                  ].map(([label, fn]) => (
                    <button key={label} onClick={() => { fn(); setExportMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">{label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bulk actions bar */}
          {selected.size > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3 mb-3 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-bold text-amber-800 dark:text-amber-300">{selected.size} selected</span>
              <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="text-sm px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                <option value="">Change status…</option>
                {ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={applyBulkStatus} disabled={!bulkStatus} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm rounded-lg font-semibold">Apply</button>
              <button onClick={() => exportCSV(filteredOrders.filter(o => selected.has(o.id)), "selected-orders.csv")} className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm rounded-lg font-semibold">Export CSV</button>
              <button onClick={bulkStar} className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm rounded-lg font-semibold">⭐ Star</button>
              <button onClick={bulkDelete} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 text-red-600 text-sm rounded-lg font-semibold">Delete</button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-sm text-slate-400 hover:text-slate-600"><X size={14} /></button>
            </div>
          )}

          {/* Orders table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-3 w-8">
                      <input type="checkbox" className="accent-amber-500" checked={allSelected}
                        onChange={e => setSelected(e.target.checked ? new Set(filteredOrders.map(o => o.id)) : new Set())} />
                    </th>
                    <th className="px-2 py-3 w-6"></th>
                    <ThSort col="date" label="Date" />
                    <ThSort col="orderNumber" label="Order No." />
                    <ThSort col="customerName" label="Customer" />
                    <ThSort col="productName" label="Product" />
                    <ThSort col="sku" label="SKU" />
                    <ThSort col="amount" label="Amount" />
                    <ThSort col="courierPartner" label="Courier" />
                    <ThSort col="courierAWB" label="AWB" />
                    <ThSort col="orderType" label="Type" />
                    <ThSort col="status" label="Status" />
                    <ThSort col="expectedDeliveryDate" label="Exp. Delivery" />
                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={14} className="py-16 text-center text-slate-400"><Package className="mx-auto mb-3 opacity-30" size={40} /><p>No orders found</p></td></tr>
                  ) : filteredOrders.map(o => {
                    const overdue = isOverdue(o);
                    return (
                      <tr key={o.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${overdue ? "bg-red-50/50 dark:bg-red-900/10" : ""} ${o.starred ? "bg-amber-50/30 dark:bg-amber-900/5" : ""}`}>
                        <td className="px-3 py-3">
                          <input type="checkbox" className="accent-amber-500" checked={selected.has(o.id)}
                            onChange={e => { const n = new Set(selected); e.target.checked ? n.add(o.id) : n.delete(o.id); setSelected(n); }} />
                        </td>
                        <td className="px-2 py-3 text-center">
                          {o.starred && <Star size={13} className="text-amber-400 fill-amber-400" />}
                          {overdue && !o.starred && <span className="text-red-500 text-xs">🔴</span>}
                        </td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">{fmtDate(o.date)}</td>
                        <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{o.orderNumber}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <p className="font-semibold text-slate-900 dark:text-white text-xs">{o.customerName}</p>
                          {o.customerPhone && <p className="text-xs text-slate-400">{o.customerPhone}</p>}
                        </td>
                        <td className="px-3 py-3 max-w-32">
                          <p className="text-xs text-slate-700 dark:text-slate-200 truncate" title={o.productName}>{o.productName}</p>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{o.sku}</td>
                        <td className="px-3 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap text-xs">{fmtCurrency(o.amount)}</td>
                        <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{o.courierPartner}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{o.courierAWB?.slice(0, 12)}</td>
                        <td className="px-3 py-3"><TypeBadge type={o.orderType} /></td>
                        <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {overdue ? <span className="text-red-500 font-semibold">{fmtDate(o.expectedDeliveryDate)}</span> : fmtDate(o.expectedDeliveryDate)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setModal({ type: "view", data: o.id })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-amber-500 transition-colors" title="View"><Eye size={14} /></button>
                            <button onClick={() => setModal({ type: "edit", data: o.id })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-500 transition-colors" title="Edit"><Edit size={14} /></button>
                            <button onClick={() => setModal({ type: "invoice", data: o.id })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-purple-500 transition-colors" title="Invoice"><Printer size={14} /></button>
                            <button onClick={() => setModal({ type: "slip", data: o.id })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-green-500 transition-colors" title="Packing Slip"><FileText size={14} /></button>
                            <button onClick={() => { if (window.confirm("Delete this order?")) deleteOrder(o.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
            <p>SalesTracker · All data stored locally · <button onClick={() => setModal({ type: "shortcuts" })} className="underline hover:text-amber-500">Keyboard shortcuts</button></p>
            <p>{orders.length} total orders</p>
          </div>
        </div>

        {/* ── MODALS ────────────────────────────────────────────────────────── */}

        {/* New Order */}
        <Modal open={modal?.type === "newOrder"} onClose={() => setModal(null)} title="Add New Order" size="max-w-3xl">
          <OrderForm initial={EMPTY_ORDER} onSave={(f) => addOrder(f, false)} onCancel={() => setModal(null)} />
        </Modal>

        {/* Edit Order */}
        {modal?.type === "edit" && activeOrder && (
          <Modal open onClose={() => setModal(null)} title={`Edit Order — ${activeOrder.orderNumber}`} size="max-w-3xl">
            <OrderForm initial={activeOrder} onSave={(f) => addOrder(f, true, activeOrder.id)} onCancel={() => setModal(null)} isEdit />
          </Modal>
        )}

        {/* View Order */}
        {modal?.type === "view" && activeOrder && (
          <OrderDetailModal
            order={activeOrder}
            onClose={() => setModal(null)}
            onEdit={() => setModal({ type: "edit", data: activeOrder.id })}
            onDelete={(id) => { deleteOrder(id); setModal(null); }}
            onStatusChange={(ids, s) => updateStatus(ids, s)}
            addNote={addNote}
            onToggleStar={toggleStar}
          />
        )}

        {/* PDF Upload */}
        <Modal open={modal?.type === "upload"} onClose={() => setModal(null)} title="📄 AI PDF Label Reader" size="max-w-2xl">
          <PDFUploader
            existingOrders={orders}
            onParsed={handleParsed}
            addToast={addToast}
            onClose={() => setModal(null)}
          />
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button onClick={() => setModal({ type: "newOrder" })} className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-600 hover:border-amber-400 text-slate-500 dark:text-slate-400 hover:text-amber-500 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <Plus size={15} /> Add Order Manually Instead
            </button>
          </div>
        </Modal>

        {/* Invoice */}
        {modal?.type === "invoice" && orders.find(o => o.id === modal.data) && (
          <PrintInvoice order={orders.find(o => o.id === modal.data)} onClose={() => setModal(null)} />
        )}

        {/* Packing Slip */}
        {modal?.type === "slip" && orders.find(o => o.id === modal.data) && (
          <PackingSlip order={orders.find(o => o.id === modal.data)} onClose={() => setModal(null)} />
        )}

        {/* Shortcuts */}
        <ShortcutsModal open={modal?.type === "shortcuts"} onClose={() => setModal(null)} />

        {/* Toast */}
        <Toast toasts={toasts} remove={removeToast} />
      </div>
    </div>
  );
}
