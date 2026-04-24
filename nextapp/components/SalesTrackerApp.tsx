"use client";

import {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import {
  Package, Star, Upload, Plus, Search, Filter, Download,
  Moon, Sun, Truck, AlertTriangle, CheckCircle, X, Eye,
  Edit, Trash2, ChevronDown, ChevronUp, Keyboard, 
  Printer, Clock, RefreshCw, FileText,
  WifiOff, ExternalLink, ArrowUp, ArrowDown,
  TrendingUp, AlertCircle, MoreHorizontal,
  RotateCcw, Home, Zap, Camera, Hash, Share2,
  MapPin, Phone, User, CreditCard, Calendar, Weight as WeightIcon,
  CheckSquare, XCircle, LogOut, ExternalLink as ExternalLinkIcon,
} from "lucide-react";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSalesStore, hydrateStore } from "@/lib/store";
import type { Order, FilterPreset } from "@/lib/store";

type Filters = Record<string, unknown>;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const COURIERS = ["Delhivery", "BlueDart", "Ekart", "DTDC", "Xpressbees", "Other"];
const ORDER_TYPES = ["Standard", "Return", "Refund"];
const ORDER_STATUSES = ["Processing", "Packed", "Dispatched", "Delivered", "Cancelled"];
const PRIORITIES = ["Normal", "Urgent", "Starred"];

const COURIER_TRACKING: Record<string, (a: string) => string | null> = {
  Delhivery:  (a) => `https://www.delhivery.com/track/package/${a}`,
  BlueDart:   (a) => `https://www.bluedart.com/tracking?trackFor=0&val=${a}`,
  Ekart:      (a) => `https://ekartlogistics.com/track?trackingId=${a}`,
  DTDC:       (a) => `https://www.dtdc.in/tracking.asp?Referanceno=${a}`,
  Xpressbees: (a) => `https://www.xpressbees.com/track?trackingNo=${a}`,
  Other:      ()  => null,
};

const EMPTY_ORDER: Partial<Order> = {
  productName: "", sku: "", invoiceNumber: "", orderNumber: "",
  amount: 0, customerName: "", customerPhone: "",
  courierPartner: "Delhivery", courierAWB: "",
  deliveryAddress: "", pincode: "", weight: "",
  date: new Date().toISOString().split("T")[0],
  expectedDeliveryDate: "", orderType: "Standard",
  status: "Processing", priority: "Normal",
  notes: [], timeline: [], starred: false,
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

const C = {
  bg:        "bg-[#0B0F1A]",
  card:      "bg-[#111827]",
  border:    "border-[#1F2937]",
  hover:     "hover:bg-[#1F2937]",
  accent:    "bg-indigo-600",
  accentHov: "hover:bg-indigo-500",
  accentTxt: "text-indigo-400",
  muted:     "text-gray-400",
  sub:       "text-gray-500",
};

// ─── UTILS ────────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number | string) => `₹${Number(n).toLocaleString("en-IN")}`;
const fmtDate = (d: string) => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "—";
const fmtTs = (ts: string) =>
  new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const isOverdue = (order: Order): boolean => {
  if (!order.expectedDeliveryDate || order.status === "Delivered" || order.status === "Cancelled") return false;
  return new Date(order.expectedDeliveryDate) < new Date(new Date().toDateString());
};

// ─── SPARKLINE ────────────────────────────────────────────────────────────────

function Sparkline({ data, color = "#6366F1", w = 120, h = 36 }: {
  data: number[]; color?: string; w?: number; h?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

interface Toast { id: string; message: string; type: string; }

const TOAST_DOT: Record<string, string> = {
  success: "bg-emerald-500", error: "bg-red-500",
  warning: "bg-amber-500",  info: "bg-indigo-500",
  delete: "bg-red-500",     export: "bg-emerald-500",
};

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl card-token border text-sm font-medium min-w-[280px] max-w-sm shadow-2xl animate-slide-in" style={{color:'var(--text)'}}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TOAST_DOT[t.type] || "bg-indigo-500"}`} />
          <span className="flex-1" style={{color:'var(--text)'}}>{t.message}</span>
          <button onClick={() => remove(t.id)} style={{color:'var(--text-sub)'}} className="hover:opacity-70 transition-opacity"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children, size = "max-w-2xl" }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${size} card-token border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{borderColor:'var(--border)'}}>
          <h2 className="font-semibold" style={{color:'var(--text)'}}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors btn-ghost"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── STATUS & TYPE BADGES ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    Processing: "badge-processing",
    Packed:     "badge-packed",
    Dispatched: "badge-dispatched",
    Delivered:  "badge-delivered",
    Cancelled:  "badge-cancelled",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls[status] || "badge-processing"}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const s: Record<string, string> = {
    Standard: "text-sub",
    Return:   "text-[--warning]",
    Refund:   "text-[--violet]",
  };
  return <span className={`text-xs font-medium ${s[type] || "text-sub"}`}>{type}</span>;
}

// ─── SHARED INPUT STYLE ───────────────────────────────────────────────────────

const inp = "w-full px-3 py-2 text-sm rounded-lg input-token focus:outline-none focus:ring-1 focus:ring-indigo-500 transition";
const sel = inp + " cursor-pointer";

// ─── ORDER FORM ───────────────────────────────────────────────────────────────

function OrderForm({ initial, onSave, onCancel, isEdit }: {
  initial: Partial<Order>; onSave: (f: Partial<Order>) => void; onCancel: () => void; isEdit?: boolean;
}) {
  const [form, setForm] = useState<Partial<Order>>({ ...EMPTY_ORDER, ...initial });
  const [newNote, setNewNote] = useState("");
  const f = <K extends keyof Order>(k: K, v: Order[K]) => setForm((p) => ({ ...p, [k]: v }));

  const addNote = () => {
    if (!newNote.trim()) return;
    setForm((p) => ({ ...p, notes: [...(p.notes || []), { text: newNote.trim(), timestamp: new Date().toISOString(), by: "User" }] }));
    setNewNote("");
  };

  const Label = ({ text }: { text: string }) => (
    <label className="block text-xs font-medium text-gray-500 mb-1.5">{text}</label>
  );

  return (
    <div className="space-y-5 text-white">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label text="Product Name" /><input className={inp} value={form.productName || ""} onChange={(e) => f("productName", e.target.value)} placeholder="Sony WH-1000XM5" /></div>
        <div><Label text="SKU" /><input className={inp} value={form.sku || ""} onChange={(e) => f("sku", e.target.value)} placeholder="SON-WH-XM5-BLK" /></div>
        <div><Label text="Invoice No." /><input className={inp} value={form.invoiceNumber || ""} onChange={(e) => f("invoiceNumber", e.target.value)} placeholder="INV-2024-XXXX" /></div>
        <div><Label text="Order No." /><input className={inp} value={form.orderNumber || ""} onChange={(e) => f("orderNumber", e.target.value)} placeholder="ORD-2024-XXXX" /></div>
        <div><Label text="Amount (₹)" /><input className={inp} type="number" value={form.amount || ""} onChange={(e) => f("amount", Number(e.target.value))} placeholder="0" /></div>
        <div><Label text="Weight" /><input className={inp} value={form.weight || ""} onChange={(e) => f("weight", e.target.value)} placeholder="500g" /></div>
      </div>
      <div className="h-px bg-[#1F2937]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label text="Customer Name" /><input className={inp} value={form.customerName || ""} onChange={(e) => f("customerName", e.target.value)} placeholder="Full name" /></div>
        <div><Label text="Phone (optional)" /><input className={inp} value={form.customerPhone || ""} onChange={(e) => f("customerPhone", e.target.value)} placeholder="10-digit" /></div>
      </div>
      <div><Label text="Delivery Address" /><textarea className={inp + " resize-none"} rows={2} value={form.deliveryAddress || ""} onChange={(e) => f("deliveryAddress", e.target.value)} placeholder="Full delivery address" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><Label text="Pincode" /><input className={inp} value={form.pincode || ""} onChange={(e) => f("pincode", e.target.value)} maxLength={6} /></div>
        <div><Label text="Courier" /><select className={sel} value={form.courierPartner || "Delhivery"} onChange={(e) => f("courierPartner", e.target.value)}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><Label text="AWB No." /><input className={inp} value={form.courierAWB || ""} onChange={(e) => f("courierAWB", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label text="Order Date" /><input className={inp} type="date" value={form.date || ""} onChange={(e) => f("date", e.target.value)} /></div>
        <div><Label text="Expected Delivery" /><input className={inp} type="date" value={form.expectedDeliveryDate || ""} onChange={(e) => f("expectedDeliveryDate", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><Label text="Order Type" /><select className={sel} value={form.orderType || "Standard"} onChange={(e) => f("orderType", e.target.value as Order["orderType"])}>{ORDER_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div><Label text="Status" /><select className={sel} value={form.status || "Processing"} onChange={(e) => f("status", e.target.value as Order["status"])}>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><Label text="Priority" /><select className={sel} value={form.priority || "Normal"} onChange={(e) => f("priority", e.target.value as Order["priority"])}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></div>
      </div>
      <div>
        <Label text="Notes" />
        <div className="space-y-2 mb-2 max-h-28 overflow-y-auto">
          {(form.notes || []).map((n, i) => (
            <div key={i} className="bg-[#0B0F1A] rounded-lg px-3 py-2 text-sm">
              <p className="text-gray-200">{n.text}</p>
              <p className="text-xs text-gray-600 mt-0.5">{fmtTs(n.timestamp)}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className={inp + " flex-1"} value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="Add a note…" />
          <button onClick={addNote} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">Add</button>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave(form)} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-colors">
          {isEdit ? "Save Changes" : "Add Order"}
        </button>
        <button onClick={onCancel} className="px-5 py-2.5 border border-[#1F2937] hover:bg-[#1F2937] text-gray-400 hover:text-white rounded-xl text-sm transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ─── PDF UPLOADER ─────────────────────────────────────────────────────────────

interface QItem { file: File; name: string; status: "pending"|"parsing"|"done"|"failed"; result: Partial<Order>|null; error: string|null; progress: number; base64?: string; }

function PDFUploader({ onParsed, existingOrders, addToast, onClose }: {
  onParsed: (d: Partial<Order>, a: "new"|"update", id?: string) => void;
  existingOrders: Order[]; addToast: (m: string, t: string) => void; onClose: () => void;
}) {
  const [queue, setQueue] = useState<QItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parsedResults, setParsedResults] = useState<{ data: Partial<Order>; fileName: string }[]>([]);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [reviewModal, setReviewModal] = useState<{ data: Partial<Order>; fileName: string } | null>(null);
  const [dupWarning, setDupWarning] = useState<{ formData: Partial<Order>; dupOrder: Order } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const PARSE_CONCURRENCY = 3;

  const toBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf") || f.type.startsWith("image/"));
    if (!valid.length) { addToast("Please upload PDF or image files", "error"); return; }
    setParsedResults([]); setReviewIndex(null); setReviewModal(null); setDupWarning(null);
    setQueue(valid.map((f) => ({ file: f, name: f.name, status: "pending", result: null, error: null, progress: 0 })));
  };

  const updateQueueItem = (index: number, patch: Partial<QItem>) => {
    setQueue((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const parseFile = async (file: File) => {
    const b64 = await toBase64(file);
    const mimeType = file.type || "application/pdf";
    const res = await fetch("/api/parse-label", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64: b64, mimeType }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || "Parse failed");
    return { data: { ...json.data, labelBase64: b64, labelMimeType: mimeType } as Partial<Order>, base64: b64, mimeType };
  };

  const startParsing = async () => {
    if (!queue.length) return;
    setParsing(true);
    const updated = [...queue];
    const results: Array<{ data: Partial<Order>; fileName: string } | null> = Array(updated.length).fill(null);
    let nextIndex = 0;
    const active = new Set<Promise<void>>();
    const schedule = () => {
      if (nextIndex >= updated.length) return;
      const index = nextIndex++;
      const task = (async () => {
        updateQueueItem(index, { status: "parsing", progress: 25 });
        try {
          const { data, base64 } = await parseFile(updated[index].file);
          updateQueueItem(index, { status: "done", progress: 100, result: data, base64 });
          results[index] = { data, fileName: updated[index].name };
        } catch (err: any) {
          updateQueueItem(index, { status: "failed", progress: 100, error: err.message });
          addToast(`Failed: ${updated[index].name}`, "error");
        }
      })().finally(() => active.delete(task));
      active.add(task);
    };
    while (nextIndex < updated.length || active.size > 0) {
      while (nextIndex < updated.length && active.size < PARSE_CONCURRENCY) schedule();
      if (active.size === 0) break;
      await Promise.race(active);
    }
    setParsing(false);
    const success = results.filter((r): r is { data: Partial<Order>; fileName: string } => r !== null);
    if (success.length) { setParsedResults(success); setReviewIndex(0); setReviewModal(success[0]); }
    else addToast("No files parsed successfully", "warning");
  };

  const advanceReview = (results: { data: Partial<Order>; fileName: string }[], nextIdx: number) => {
    if (nextIdx < results.length) { setReviewIndex(nextIdx); setReviewModal(results[nextIdx]); }
    else { setReviewIndex(null); setReviewModal(null); addToast("All reviewed ✓", "success"); }
  };

  const handleReviewSave = (formData: Partial<Order>) => {
    const currentIdx = reviewIndex ?? 0;
    const dup = existingOrders.find((o) => (formData.orderNumber && o.orderNumber === formData.orderNumber) || (formData.courierAWB && o.courierAWB === formData.courierAWB));
    if (dup) { setReviewModal(null); setDupWarning({ formData, dupOrder: dup }); }
    else { onParsed(formData, "new"); addToast("Added ✓", "success"); advanceReview(parsedResults, currentIdx + 1); }
  };

  const handleReviewSkip = () => { const idx = reviewIndex ?? 0; advanceReview(parsedResults, idx + 1); };

  const handleDup = (action: "update" | "new" | "discard") => {
    if (!dupWarning) return;
    if (action === "update") { onParsed(dupWarning.formData, "update", dupWarning.dupOrder.id); addToast("Updated ✓", "success"); }
    else if (action === "new") { onParsed(dupWarning.formData, "new"); addToast("Added new ✓", "success"); }
    setDupWarning(null); advanceReview(parsedResults, (reviewIndex ?? 0) + 1);
  };

  return (
    <div className="space-y-4">
      {reviewIndex === null && !parsing && (
        <div ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("border-indigo-500"); }}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#1F2937] rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
        >
          <Upload className="mx-auto mb-3 text-gray-600" size={32} />
          <p className="text-gray-300 font-medium text-sm">Drop PDF shipping labels here</p>
          <p className="text-xs text-indigo-400 mt-2 flex items-center justify-center gap-1"><Camera size={11} /> Camera supported on mobile</p>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
      )}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item, i) => (
            <div key={i} className="bg-[#0B0F1A] rounded-xl p-3 border border-[#1F2937]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300 truncate max-w-[200px]">{item.name}</span>
                <span className="text-[10px] text-gray-500">{item.status}</span>
              </div>
              <div className="h-1 bg-[#1F2937] rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${item.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {queue.length > 0 && !parsing && reviewIndex === null && queue.some(q => q.status === 'pending') && (
        <button onClick={startParsing} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
          <Zap size={14} /> Parse {queue.length} with AI
        </button>
      )}
      {reviewModal && (
        <Modal open title={`Review — ${reviewModal.fileName}`} onClose={handleReviewSkip} size="max-w-3xl">
          <OrderForm key={reviewIndex} initial={reviewModal.data} onSave={handleReviewSave} onCancel={handleReviewSkip} />
        </Modal>
      )}
      {dupWarning && (
        <Modal open title="Duplicate Detected" onClose={() => setDupWarning(null)} size="max-w-sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-400">An order with this number already exists. Replace it?</p>
            <div className="flex gap-3">
              <button onClick={() => handleDup("update")} className="flex-1 py-2 bg-indigo-600 rounded-lg text-sm font-bold">Replace</button>
              <button onClick={() => handleDup("new")} className="flex-1 py-2 bg-[#1F2937] rounded-lg text-sm font-bold">New</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── ORDER DETAIL MODAL ───────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose, onEdit, onDelete, onAddNote, onToggleStar }: {
  order: Order; onClose: () => void; onEdit: () => void;
  onDelete: (id: string) => void; onAddNote: (id: string, text: string) => void; onToggleStar: (id: string) => void;
}) {
  const [newNote, setNewNote] = useState("");
  const trackUrl = COURIER_TRACKING[order.courierPartner]?.(order.courierAWB);
  const STATUS_STEPS = ["Processing", "Packed", "Dispatched", "Delivered"];
  const curStep = STATUS_STEPS.indexOf(order.status);
  const overdue = isOverdue(order);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}#/track/${order.orderNumber}` : "";
  const submitNote = () => { if (!newNote.trim()) return; onAddNote(order.id, newNote.trim()); setNewNote(""); };

  return (
    <Modal open onClose={onClose} title={order.orderNumber} size="max-w-2xl">
      <div className="space-y-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="flex flex-row sm:flex-1 items-center gap-3 sm:gap-0">
              <div className="flex flex-row sm:flex-col items-center flex-shrink-0 gap-3 sm:gap-0">
                <div className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${i < curStep ? "bg-emerald-500 text-white" : i === curStep ? "bg-indigo-600 text-white ring-4 ring-indigo-600/20" : "bg-[#1F2937] text-gray-600"}`}>
                  {i < curStep ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={`text-xs sm:text-[10px] sm:mt-1 font-medium whitespace-nowrap ${i <= curStep ? "text-gray-300" : "text-gray-600"}`}>{s}</span>
              </div>
              {i < STATUS_STEPS.length - 1 && <div className={`hidden sm:block h-px flex-1 mb-4 mx-1 ${i < curStep ? "bg-emerald-500" : "bg-[#1F2937]"}`} />}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {[ ["Product", order.productName], ["SKU", order.sku], ["Amount", fmtCurrency(order.amount)], ["Customer", order.customerName], ["Courier", order.courierPartner], ["AWB", order.courierAWB] ].map(([k, v]) => (
            <div key={k}><p className="text-xs text-gray-500 mb-0.5">{k}</p><p className="text-gray-200 font-medium break-words">{v}</p></div>
          ))}
          <div className="sm:col-span-2"><p className="text-xs text-gray-500 mb-0.5">Address</p><p className="text-gray-200 text-xs">{order.deliveryAddress}</p></div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#0B0F1A] border border-[#1F2937] rounded-xl px-3 py-2">
          <input readOnly value={shareUrl} className="flex-1 text-[10px] bg-transparent text-gray-600 font-mono truncate outline-none" />
          <button onClick={() => { navigator.clipboard?.writeText(shareUrl); }} className="text-xs font-bold text-accent">Copy Link</button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={onEdit} className="flex-1 py-3 sm:py-2 bg-indigo-600 rounded-xl font-bold text-sm">Edit</button>
          <button onClick={() => onToggleStar(order.id)} className="flex-1 py-3 sm:py-2 border border-[#1F2937] rounded-xl text-sm">{order.starred ? "Unstar" : "Star"}</button>
          <button onClick={() => { if (confirm("Delete?")) { onDelete(order.id); onClose(); } }} className="flex-1 py-3 sm:py-2 bg-red-500/10 text-red-400 rounded-xl text-sm">Delete</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── TRACKING PAGE ────────────────────────────────────────────────────────────

function TrackingPage({ orderNumber, orders, onBack }: { orderNumber: string; orders: Order[]; onBack: () => void }) {
  const order = orders.find((o) => o.orderNumber === orderNumber);
  const STATUS_STEPS = ["Processing", "Packed", "Dispatched", "Delivered"];
  const curStep = order ? STATUS_STEPS.indexOf(order.status) : -1;
  if (!order) return <div className="min-h-screen bg-[#0B0F1A] text-white flex items-center justify-center">Order not found.</div>;
  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111827] border border-[#1F2937] rounded-2xl p-6 space-y-6 shadow-2xl text-white">
        <h1 className="text-xl font-bold font-mono">{order.orderNumber}</h1>
        <div className="space-y-4">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="flex gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= curStep ? "bg-emerald-500" : "bg-gray-800 text-gray-500"}`}>{i < curStep ? "✓" : i + 1}</div>
              <p className={`pt-1 text-sm font-medium ${i <= curStep ? "text-white" : "text-gray-600"}`}>{s}</p>
            </div>
          ))}
        </div>
        <button onClick={onBack} className="w-full py-2.5 bg-indigo-600 rounded-xl text-sm font-bold">Dashboard</button>
      </div>
    </div>
  );
}

// ─── KPI CARDS ────────────────────────────────────────────────────────────────

function KPICards({ orders, onFilter, onOpenAnalytics }: { orders: Order[]; onFilter: (f: Record<string, unknown>) => void; onOpenAnalytics: () => void }) {
  const stats = useMemo(() => {
    const revenue = orders.filter((o) => o.orderType !== "Return").reduce((s, o) => s + Number(o.amount || 0), 0);
    const total = orders.length;
    const dispatched = orders.filter((o) => o.status === "Dispatched" || o.status === "Delivered").length;
    const processing = orders.filter((o) => o.status === "Processing").length;
    const packed = orders.filter((o) => o.status === "Packed").length;
    const shipped = orders.filter((o) => o.status === "Dispatched").length;
    const delivered = orders.filter((o) => o.status === "Delivered").length;
    return { revenue, total, dispatched, processing, packed, shipped, delivered };
  }, [orders]);
  const dispatchRate = stats.total ? Math.round((stats.dispatched / stats.total) * 100) : 0;
  const cards = [
    { label: "Total Revenue", value: fmtCurrency(stats.revenue), sub: `${stats.total} orders`, filter: {}, full: true },
    { label: "Total Orders", value: stats.total, sub: "all time", filter: {} },
    { label: "Dispatch Rate", value: `${dispatchRate}%`, sub: `${stats.dispatched} shipped`, filter: { status: ["Dispatched", "Delivered"] } },
  ];
  const bottom = [
    { label: "Processing", value: stats.processing, icon: Clock, filter: { status: ["Processing"] } },
    { label: "Packed", value: stats.packed, icon: Package, filter: { status: ["Packed"] } },
    { label: "Shipped", value: stats.shipped, icon: Truck, filter: { status: ["Dispatched"] } },
    { label: "Delivered", value: stats.delivered, icon: CheckCircle, filter: { status: ["Delivered"] } },
  ];
  return (
    <div className="mb-8 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <button key={i} onClick={() => i === 0 ? onOpenAnalytics() : onFilter(c.filter)} className={`kpi-card rounded-2xl p-5 text-left border border-transparent hover:border-indigo-400/40 transition ${c.full ? 'md:col-span-2' : ''}`}>
            <p className="kpi-label text-xs mb-1">{c.label}</p>
            <p className="kpi-value text-2xl font-black">{c.value}</p>
            <p className="kpi-sub text-[10px] mt-1 opacity-60">{c.sub}</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {bottom.map((c, i) => (
          <button key={i} onClick={() => onFilter(c.filter)} className="kpi-card rounded-2xl p-4 text-left">
            <p className="kpi-label text-[10px] mb-1">{c.label}</p>
            <p className="kpi-value text-xl font-bold">{c.value}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────

function FilterBar({ filters, setFilters, presets, onSavePreset, onDeletePreset, onApplyPreset }: {
  filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  presets: FilterPreset[]; onSavePreset: (n: string) => void;
  onDeletePreset: (n: string) => void; onApplyPreset: (p: FilterPreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasFilters = Object.values(filters).some((v) => Array.isArray(v) ? v.length > 0 : !!v);
  const toggle = (k: string, v: string) => {
    const arr = (filters[k] as string[]) || [];
    setFilters(p => ({ ...p, [k]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }));
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-token">
        <Filter size={12} /> Filters {hasFilters && "•"} {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 z-50 w-72 bg-[#111827] border border-[#1F2937] rounded-2xl shadow-2xl p-5 space-y-4">
           <div>
              <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map(s => (
                  <button key={s} onClick={() => toggle('status', s)} className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${ ((filters.status as string[]) || []).includes(s) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-[#1F2937] text-gray-400 hover:border-gray-600'}`}>{s}</button>

                ))}
              </div>
           </div>
           <button onClick={() => setFilters({})} className="w-full py-2 text-[10px] font-black uppercase text-gray-500 border border-[#1F2937] rounded-lg hover:text-white hover:border-gray-600">Clear All</button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN SALES TRACKER APP ───────────────────────────────────────────────────

export default function SalesTrackerApp() {
  useEffect(() => { hydrateStore(); }, []);
  const router = useRouter();
  const supabase = createClient();
  const { orders, presets, addOrder, deleteOrder, updateStatus, addNote, toggleStar, savePreset, deletePreset, toggleDarkMode, darkMode } = useSalesStore();

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/auth/login'); };

  const [searchQ, setSearchQ] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: "asc"|"desc" }[]>([{ col: "date", dir: "desc" }]);

  const handleSavePreset = useCallback((name: string) => { savePreset(name, filters); }, [filters, savePreset]);
  const handleDeletePreset = useCallback((name: string) => { deletePreset(name); }, [deletePreset]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<{ type: string; data?: string } | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFabOpen, setMobileFabOpen] = useState(false);
  const [mobileMenuId, setMobileMenuId] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<"home" | "orders" | "analytics">("home");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true); const off = () => setIsOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const check = () => { const h = window.location.hash; setTrackingId(h.startsWith("#/track/") ? decodeURIComponent(h.slice(8)) : null); };
    check(); window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  const addToast = useCallback((m: string, t = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, message: m, type: t }]);
    setTimeout(() => removeToast(id), 3000);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(p => p.filter(x => x.id !== id)), []);

  const handleAddOrder = (f: Partial<Order>, isEdit = false, id?: string) => { addOrder(f, isEdit, id); addToast(isEdit ? "Updated" : "Added", "success"); setModal(null); };
  const handleDeleteOrder = (id: string) => { deleteOrder(id); addToast("Deleted", "delete"); };
  const handlePrintLabel = (o: Order) => { if (o.labelBase64) window.open(`data:${o.labelMimeType};base64,${o.labelBase64}`, "_blank"); };
  const handleParsed = (d: Partial<Order>, a: "new"|"update", id?: string) => { handleAddOrder(d, a === "update", id); };

  const filteredOrders = useMemo(() => {
    let res = [...orders];
    if (searchQ) { const q = searchQ.toLowerCase(); res = res.filter(o => [o.customerName, o.orderNumber, o.sku].some(f => f?.toLowerCase().includes(q))); }
    if ((filters.status as string[])?.length) res = res.filter(o => (filters.status as string[]).includes(o.status));
    res.sort((a, b) => {
      for (const { col, dir } of sortConfig) {
        const va = (a as any)[col] ?? ""; const vb = (b as any)[col] ?? "";
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return res;
  }, [orders, searchQ, filters, sortConfig]);

  const handleSort = (col: string) => setSortConfig(p => [{ col, dir: p[0]?.col === col && p[0].dir === "asc" ? "desc" : "asc" }]);

  const activeOrder = (modal?.type === "view" || modal?.type === "edit") ? orders.find(o => o.id === modal?.data) : null;

  if (trackingId) return <TrackingPage orderNumber={trackingId} orders={orders} onBack={() => { window.location.hash = ""; }} />;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`} style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <nav className="navbar sticky top-0 z-30 bg-header border-b border-token">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm"><Package size={18} className="text-indigo-500" /> SalesTracker</div>
          
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input ref={searchRef} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search orders..." className="w-full pl-9 pr-4 py-2 bg-subtle border border-token rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleDarkMode} className="p-2 hover:bg-subtle rounded-lg">{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button onClick={() => setModal({ type: 'upload' })} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"><Upload size={14} /> Upload</button>
            <button onClick={handleLogout} className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg"><LogOut size={16} /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-4 py-6 pb-24">
        {/* Desktop View */}
        <div className="hidden md:block space-y-6">
          <KPICards orders={orders} onFilter={setFilters} onOpenAnalytics={() => setAnalyticsOpen(true)} />
          <div className="card-token border rounded-2xl overflow-hidden">
             <div className="px-6 py-4 flex items-center justify-between bg-subtle/30 border-b border-token">
                <span className="text-xs font-bold">{filteredOrders.length} Orders</span>
                <FilterBar filters={filters} setFilters={setFilters} presets={presets} onSavePreset={handleSavePreset} onDeletePreset={handleDeletePreset} onApplyPreset={p => setFilters(p.filters)} />
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-xs">
                 <thead className="bg-subtle/50 text-gray-500 uppercase tracking-widest font-black">
                   <tr>
                     <th className="px-6 py-3">Order</th>
                     <th className="px-6 py-3">Customer</th>
                     <th className="px-6 py-3">Amount</th>
                     <th className="px-6 py-3">Status</th>
                     <th className="px-6 py-3 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-token">
                   {filteredOrders.map(o => (
                     <tr key={o.id} className="hover:bg-subtle/30 transition-colors">
                       <td className="px-6 py-4 font-mono font-bold">{o.orderNumber}</td>
                       <td className="px-6 py-4 font-bold">{o.customerName}</td>
                       <td className="px-6 py-4 font-black">{fmtCurrency(o.amount)}</td>
                       <td className="px-6 py-4"><StatusBadge status={o.status} /></td>
                       <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                           <button onClick={() => setModal({ type: 'view', data: o.id })} className="p-1.5 hover:bg-subtle rounded-md"><Eye size={14} /></button>
                           <button onClick={() => setModal({ type: 'edit', data: o.id })} className="p-1.5 hover:bg-subtle rounded-md"><Edit size={14} /></button>
                           <button onClick={() => handleDeleteOrder(o.id)} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-md"><Trash2 size={14} /></button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {mobileActiveTab === "home" && (
            <div className="space-y-6">
              <KPICards orders={orders} onFilter={f => { setFilters(f); setMobileActiveTab('orders'); }} onOpenAnalytics={() => setAnalyticsOpen(true)} />
              <div className="flex justify-between items-center px-1">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Recent Activity</h2>
                <button onClick={() => setMobileActiveTab('orders')} className="text-xs font-bold text-indigo-500">View All</button>
              </div>
              <div className="space-y-3">
                {orders.slice(0, 5).map(o => (
                  <article key={o.id} onClick={() => setModal({ type: 'view', data: o.id })} className="bg-card border border-token rounded-2xl p-4 active:scale-95 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono font-bold text-gray-500">{o.orderNumber}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm font-bold">{o.customerName}</p>
                        <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{o.productName}</p>
                      </div>
                      <p className="text-base font-black">{fmtCurrency(o.amount)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {mobileActiveTab === "orders" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-black">Orders ({filteredOrders.length})</h2>
                <FilterBar filters={filters} setFilters={setFilters} presets={presets} onSavePreset={handleSavePreset} onDeletePreset={handleDeletePreset} onApplyPreset={p => setFilters(p.filters)} />
              </div>
              <div className="space-y-3">
                {filteredOrders.map(o => {
                   const isMenuOpen = mobileMenuId === o.id;
                   return (
                    <article key={o.id} className="bg-card border border-token rounded-2xl p-4 transition-all">
                      <div className="flex justify-between items-start">
                        <div onClick={() => setModal({ type: 'view', data: o.id })} className="flex-1">
                          <p className="text-[10px] font-mono text-gray-500">{o.orderNumber}</p>
                          <p className="text-sm font-bold mt-1">{o.customerName}</p>
                        </div>
                        <button onClick={() => setMobileMenuId(isMenuOpen ? null : o.id)} className="p-2 text-gray-500"><MoreHorizontal size={18} /></button>
                      </div>
                      <div className="flex justify-between items-end mt-3" onClick={() => setModal({ type: 'view', data: o.id })}>
                        <div><StatusBadge status={o.status} /><p className="text-[10px] text-gray-500 mt-1">{fmtDate(o.date)}</p></div>
                        <p className="text-lg font-black">{fmtCurrency(o.amount)}</p>
                      </div>
                      {isMenuOpen && (
                        <div className="mt-4 pt-3 border-t border-token flex justify-around">
                          <button onClick={() => setModal({ type:'view', data:o.id })} className="flex flex-col items-center gap-1 text-[10px] font-bold"><Eye size={16} /> View</button>
                          <button onClick={() => setModal({ type:'edit', data:o.id })} className="flex flex-col items-center gap-1 text-[10px] font-bold"><Edit size={16} /> Edit</button>
                          <button onClick={() => { if(confirm('Delete?')) handleDeleteOrder(o.id); }} className="flex flex-col items-center gap-1 text-[10px] font-bold text-red-500"><Trash2 size={16} /> Delete</button>
                        </div>
                      )}
                    </article>
                   )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="md:hidden bottom-nav">
        <button onClick={() => setMobileActiveTab("home")} className={`bottom-nav-item ${mobileActiveTab === "home" ? "active" : ""}`}><Home size={20} /><span>Home</span></button>
        <button onClick={() => setMobileActiveTab("orders")} className={`bottom-nav-item ${mobileActiveTab === "orders" ? "active" : ""}`}><Package size={20} /><span>Orders</span></button>
        <div className="flex-1 flex justify-center -mt-8">
           <button onClick={() => setMobileFabOpen(true)} className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center border-4 border-app"><Plus size={24} /></button>
        </div>
        <button onClick={() => setAnalyticsOpen(true)} className={`bottom-nav-item ${analyticsOpen ? "active" : ""}`}><TrendingUp size={20} /><span>Insights</span></button>
        <button onClick={() => setModal({ type: 'shortcuts' })} className="bottom-nav-item"><Keyboard size={20} /><span>Tools</span></button>
      </div>

      {mobileFabOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileFabOpen(false)}>
           <div className="absolute bottom-24 right-6 flex flex-col gap-3 items-end">
              <button onClick={() => { setModal({ type: 'upload' }); setMobileFabOpen(false); }} className="flex items-center gap-2 px-4 py-2.5 bg-card border border-token rounded-full text-sm font-bold"><Upload size={14} /> Upload PDF</button>
              <button onClick={() => { setModal({ type: 'newOrder' }); setMobileFabOpen(false); }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-bold"><Plus size={14} /> New Order</button>
           </div>
        </div>
      )}

      <Modal open={modal?.type === 'newOrder'} title="New Order" onClose={() => setModal(null)} size="max-w-3xl">
        <OrderForm initial={EMPTY_ORDER} onSave={f => handleAddOrder(f)} onCancel={() => setModal(null)} />
      </Modal>
      {modal?.type === 'edit' && activeOrder && (
        <Modal open title="Edit Order" onClose={() => setModal(null)} size="max-w-3xl">
          <OrderForm initial={activeOrder} isEdit onSave={f => handleAddOrder(f, true, activeOrder.id)} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'view' && activeOrder && (
        <OrderDetailModal order={activeOrder} onClose={() => setModal(null)} onEdit={() => setModal({ type: 'edit', data: activeOrder.id })} onDelete={handleDeleteOrder} onAddNote={addNote} onToggleStar={toggleStar} />
      )}
      <Modal open={modal?.type === 'upload'} title="AI Label Reader" onClose={() => setModal(null)} size="max-w-xl">
        <PDFUploader existingOrders={orders} onParsed={handleParsed} addToast={addToast} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'shortcuts'} title="Shortcuts" onClose={() => setModal(null)} size="max-w-sm">
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex justify-between"><span>New Order</span><kbd className="bg-subtle px-1.5 rounded">N</kbd></div>
          <div className="flex justify-between"><span>Search</span><kbd className="bg-subtle px-1.5 rounded">/</kbd></div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} remove={removeToast} />
      <AnalyticsDashboard open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} orders={orders} darkMode={darkMode} />
    </div>
  );
}
