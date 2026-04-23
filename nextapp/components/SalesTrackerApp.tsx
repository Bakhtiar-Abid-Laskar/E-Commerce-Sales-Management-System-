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
  CheckSquare, XCircle, LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSalesStore, hydrateStore } from "@/lib/store";
import type { Order, FilterPreset } from "@/lib/store";

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
      <div className="grid grid-cols-2 gap-4">
        <div><Label text="Product Name" /><input className={inp} value={form.productName || ""} onChange={(e) => f("productName", e.target.value)} placeholder="Sony WH-1000XM5" /></div>
        <div><Label text="SKU" /><input className={inp} value={form.sku || ""} onChange={(e) => f("sku", e.target.value)} placeholder="SON-WH-XM5-BLK" /></div>
        <div><Label text="Invoice No." /><input className={inp} value={form.invoiceNumber || ""} onChange={(e) => f("invoiceNumber", e.target.value)} placeholder="INV-2024-XXXX" /></div>
        <div><Label text="Order No." /><input className={inp} value={form.orderNumber || ""} onChange={(e) => f("orderNumber", e.target.value)} placeholder="ORD-2024-XXXX" /></div>
        <div><Label text="Amount (₹)" /><input className={inp} type="number" value={form.amount || ""} onChange={(e) => f("amount", Number(e.target.value))} placeholder="0" /></div>
        <div><Label text="Weight" /><input className={inp} value={form.weight || ""} onChange={(e) => f("weight", e.target.value)} placeholder="500g" /></div>
      </div>
      <div className="h-px bg-[#1F2937]" />
      <div className="grid grid-cols-2 gap-4">
        <div><Label text="Customer Name" /><input className={inp} value={form.customerName || ""} onChange={(e) => f("customerName", e.target.value)} placeholder="Full name" /></div>
        <div><Label text="Phone (optional)" /><input className={inp} value={form.customerPhone || ""} onChange={(e) => f("customerPhone", e.target.value)} placeholder="10-digit" /></div>
      </div>
      <div><Label text="Delivery Address" /><textarea className={inp + " resize-none"} rows={2} value={form.deliveryAddress || ""} onChange={(e) => f("deliveryAddress", e.target.value)} placeholder="Full delivery address" /></div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label text="Pincode" /><input className={inp} value={form.pincode || ""} onChange={(e) => f("pincode", e.target.value)} maxLength={6} /></div>
        <div><Label text="Courier" /><select className={sel} value={form.courierPartner || "Delhivery"} onChange={(e) => f("courierPartner", e.target.value)}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><Label text="AWB No." /><input className={inp} value={form.courierAWB || ""} onChange={(e) => f("courierAWB", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label text="Order Date" /><input className={inp} type="date" value={form.date || ""} onChange={(e) => f("date", e.target.value)} /></div>
        <div><Label text="Expected Delivery" /><input className={inp} type="date" value={form.expectedDeliveryDate || ""} onChange={(e) => f("expectedDeliveryDate", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
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
  // All successfully-parsed results — populated after EVERY file has been processed
  const [parsedResults, setParsedResults] = useState<{ data: Partial<Order>; fileName: string }[]>([]);
  // Index into parsedResults for the current review step (null = not yet reviewing)
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [reviewModal, setReviewModal] = useState<{ data: Partial<Order>; fileName: string } | null>(null);
  const [dupWarning, setDupWarning] = useState<{ formData: Partial<Order>; dupOrder: Order } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf") || f.type.startsWith("image/"));
    if (!valid.length) { addToast("Please upload PDF or image files", "error"); return; }
    // Reset everything when the user picks new files
    setParsedResults([]);
    setReviewIndex(null);
    setReviewModal(null);
    setDupWarning(null);
    setQueue(valid.map((f) => ({ file: f, name: f.name, status: "pending", result: null, error: null, progress: 0 })));
  };

  // ── STEP 1: Parse ALL files first, collect results ────────────────────────────
  const startParsing = async () => {
    if (!queue.length) return;
    setParsing(true);
    let updated = [...queue];
    const collected: { data: Partial<Order>; fileName: string }[] = [];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: "parsing", progress: 30 };
      setQueue([...updated]);
      try {
        const b64 = await toBase64(updated[i].file);
        const mimeType = updated[i].file.type || "application/pdf";
        updated[i] = { ...updated[i], progress: 60, base64: b64 };
        setQueue([...updated]);
        const res = await fetch("/api/parse-label", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64: b64, mimeType }),
        });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || "Parse failed");
        // Attach the label image/PDF to the parsed data so it can be printed later
        const dataWithLabel: Partial<Order> = { ...json.data, labelBase64: b64, labelMimeType: mimeType };
        updated[i] = { ...updated[i], status: "done", progress: 100, result: dataWithLabel };
        setQueue([...updated]);
        collected.push({ data: dataWithLabel, fileName: updated[i].name });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        updated[i] = { ...updated[i], status: "failed", progress: 100, error: msg };
        setQueue([...updated]);
        addToast(`Failed to parse "${updated[i].name}": ${msg}`, "error");
      }
      if (i < updated.length - 1) await new Promise((r) => setTimeout(r, 400));
    }

    setParsing(false);

    // ── STEP 2: Open sequential review for every successfully-parsed result ─────
    if (collected.length > 0) {
      setParsedResults(collected);
      setReviewIndex(0);
      setReviewModal(collected[0]);
    } else {
      addToast("No files could be parsed successfully", "warning");
    }
  };

  // ── Advance to the next review item ───────────────────────────────────────────
  const advanceReview = (results: { data: Partial<Order>; fileName: string }[], nextIdx: number) => {
    if (nextIdx < results.length) {
      setReviewIndex(nextIdx);
      setReviewModal(results[nextIdx]);
    } else {
      setReviewIndex(null);
      setReviewModal(null);
      addToast(`All ${results.length} file${results.length > 1 ? "s" : ""} reviewed ✓`, "success");
    }
  };

  // ── User confirms/edits a parsed result ─────────────────────────────────────
  const handleReviewSave = (formData: Partial<Order>) => {
    const currentIdx = reviewIndex ?? 0;
    const dup = existingOrders.find(
      (o) => (formData.orderNumber && o.orderNumber === formData.orderNumber) ||
              (formData.courierAWB && o.courierAWB === formData.courierAWB)
    );
    if (dup) {
      // Pause review, show dup modal — review resumes after dup is resolved
      setReviewModal(null);
      setDupWarning({ formData, dupOrder: dup });
    } else {
      onParsed(formData, "new");
      addToast(`"${parsedResults[currentIdx]?.fileName}" added ✓`, "success");
      setReviewModal(null);
      advanceReview(parsedResults, currentIdx + 1);
    }
  };

  // ── User skips a review (Cancel / X) ─────────────────────────────────────────
  const handleReviewSkip = () => {
    const currentIdx = reviewIndex ?? 0;
    addToast(`Skipped "${parsedResults[currentIdx]?.fileName}"`, "info");
    setReviewModal(null);
    advanceReview(parsedResults, currentIdx + 1);
  };

  // ── Duplicate resolution — ALWAYS advances to next file ───────────────────────
  const handleDup = (action: "update" | "new" | "discard") => {
    if (!dupWarning) return;
    const currentIdx = reviewIndex ?? 0;
    if (action === "update") {
      onParsed(dupWarning.formData, "update", dupWarning.dupOrder.id);
      addToast(`Updated existing order ${dupWarning.dupOrder.orderNumber} ✓`, "success");
    } else if (action === "new") {
      onParsed(dupWarning.formData, "new");
      addToast("Added as new order ✓", "success");
    } else {
      addToast("Duplicate skipped", "info");
    }
    setDupWarning(null);
    // Always continue to next PDF regardless of which action was chosen
    advanceReview(parsedResults, currentIdx + 1);
  };

  const statusColor: Record<string, string> = { pending: "bg-gray-700", parsing: "bg-indigo-500", done: "bg-emerald-500", failed: "bg-red-500" };
  const doneCount = queue.filter((q) => q.status === "done").length;
  const failCount = queue.filter((q) => q.status === "failed").length;
  const allParsed = queue.length > 0 && queue.every((q) => q.status === "done" || q.status === "failed");

  return (
    <div className="space-y-4">

      {/* Drop zone — hidden during review phase */}
      {reviewIndex === null && !parsing && (
        <div ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("border-indigo-500"); }}
          onDragLeave={() => dropRef.current?.classList.remove("border-indigo-500")}
          onDrop={(e) => { e.preventDefault(); dropRef.current?.classList.remove("border-indigo-500"); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#1F2937] rounded-xl p-10 text-center cursor-pointer hover:border-indigo-500 transition-colors"
        >
          <Upload className="mx-auto mb-3 text-gray-600" size={32} />
          <p className="text-gray-300 font-medium">Drop PDF shipping labels here</p>
          <p className="text-sm text-gray-600 mt-1">or click to browse · PDFs &amp; images supported</p>
          <p className="text-xs text-indigo-400 mt-2 flex items-center justify-center gap-1"><Camera size={11} /> Camera supported on mobile</p>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
      )}

      {/* Per-file progress list */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item, i) => (
            <div key={i} className="bg-[#0B0F1A] rounded-xl p-3 border border-[#1F2937]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300 truncate max-w-[240px]">{item.name}</span>
                <span className={`text-xs font-medium ${
                  item.status === "done" ? "text-emerald-400" :
                  item.status === "failed" ? "text-red-400" :
                  item.status === "parsing" ? "text-indigo-400 animate-pulse" :
                  "text-gray-500"
                }`}>
                  {item.status === "done" ? "✓ Parsed" : item.status === "failed" ? "✗ Failed" : item.status === "parsing" ? "Parsing…" : "Waiting"}
                </span>
              </div>
              <div className="h-1 bg-[#1F2937] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${statusColor[item.status]}`} style={{ width: `${item.progress}%` }} />
              </div>
              {item.error && <p className="text-xs text-red-400 mt-1.5 truncate">{item.error}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Parsing spinner */}
      {parsing && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-indigo-400">
          <RefreshCw size={14} className="animate-spin" /> Parsing all files… please wait
        </div>
      )}

      {/* Summary after parsing completes */}
      {allParsed && reviewIndex === null && !parsing && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0B0F1A] border border-[#1F2937] rounded-xl text-sm">
          {doneCount > 0 && <span className="text-emerald-400 font-medium">✓ {doneCount} parsed successfully</span>}
          {failCount > 0 && <span className="text-red-400 font-medium">✗ {failCount} failed</span>}
        </div>
      )}

      {/* Review progress pill */}
      {reviewIndex !== null && parsedResults.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/10 border border-indigo-600/20 rounded-xl text-sm text-indigo-400">
          <FileText size={13} />
          Reviewing {reviewIndex + 1} of {parsedResults.length} — resolve each file to continue
        </div>
      )}

      {/* Parse button */}
      {queue.length > 0 && !parsing && queue.some((q) => q.status === "pending") && reviewIndex === null && (
        <button onClick={startParsing} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
          <Zap size={15} /> Parse {queue.length} file{queue.length > 1 ? "s" : ""} with AI
        </button>
      )}

      {/* ── Review modal (steps sequentially through parsedResults) ──────────────── */}
      {reviewModal && (
        <Modal
          open
          size="max-w-3xl"
          title={parsedResults.length > 1
            ? `Review (${(reviewIndex ?? 0) + 1}/${parsedResults.length}) — ${reviewModal.fileName}`
            : `Review — ${reviewModal.fileName}`
          }
          onClose={handleReviewSkip}
        >
          <OrderForm
            initial={{ ...EMPTY_ORDER, ...reviewModal.data }}
            onSave={handleReviewSave}
            onCancel={handleReviewSkip}
          />
        </Modal>
      )}

      {/* ── Duplicate warning modal ───────────────────────────────────────────────── */}
      {dupWarning && (
        <Modal open size="max-w-sm" title="Duplicate Detected" onClose={() => handleDup("discard")}>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              An order with the same Order No. or AWB already exists:{" "}
              <span className="text-white font-mono">{dupWarning.dupOrder.orderNumber}</span>
            </p>
            {parsedResults.length > 1 && (reviewIndex ?? 0) + 1 < parsedResults.length && (
              <p className="text-xs text-indigo-400 bg-indigo-600/10 border border-indigo-600/20 rounded-lg px-3 py-2">
                {parsedResults.length - (reviewIndex ?? 0) - 1} more file{parsedResults.length - (reviewIndex ?? 0) - 1 !== 1 ? "s" : ""} will be reviewed after this.
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => handleDup("update")} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors">Replace Existing</button>
              <button onClick={() => handleDup("new")} className="flex-1 py-2.5 bg-[#1F2937] hover:bg-[#374151] text-white rounded-xl text-sm font-semibold transition-colors">Add as New</button>
              <button onClick={() => handleDup("discard")} className="px-4 text-gray-500 hover:text-gray-300 text-sm transition-colors">Skip</button>
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
        {overdue && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            <AlertCircle size={14} /> This order is overdue
          </div>
        )}

        {/* Status stepper */}
        <div className="flex items-center gap-0">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${i < curStep ? "bg-emerald-500 text-white" : i === curStep ? "bg-indigo-600 text-white ring-4 ring-indigo-600/20" : "bg-[#1F2937] text-gray-600"}`}>
                  {i < curStep ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${i <= curStep ? "text-gray-300" : "text-gray-600"}`}>{s}</span>
              </div>
              {i < STATUS_STEPS.length - 1 && <div className={`h-px flex-1 mb-4 mx-1 ${i < curStep ? "bg-emerald-500" : "bg-[#1F2937]"}`} />}
            </div>
          ))}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {[
            ["Product", order.productName], ["SKU", order.sku],
            ["Invoice", order.invoiceNumber], ["Amount", fmtCurrency(order.amount)],
            ["Customer", order.customerName], ["Phone", order.customerPhone || "—"],
            ["Courier", order.courierPartner], ["AWB", order.courierAWB],
            ["Pincode", order.pincode], ["Weight", order.weight],
            ["Order Date", fmtDate(order.date)], ["Expected Delivery", fmtDate(order.expectedDeliveryDate)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-gray-500 mb-0.5">{k}</p>
              <p className="text-gray-200 font-medium">{v}</p>
            </div>
          ))}
          <div className="col-span-2">
            <p className="text-xs text-gray-500 mb-0.5">Delivery Address</p>
            <p className="text-gray-200">{order.deliveryAddress}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={order.status} />
          <TypeBadge type={order.orderType} />
          {order.starred && <span className="text-xs text-amber-400">★ Starred</span>}
          {order.priority === "Urgent" && <span className="text-xs text-red-400 font-medium">⚡ Urgent</span>}
        </div>

        {trackUrl && (
          <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            <ExternalLink size={13} /> Track on {order.courierPartner}
          </a>
        )}

        {/* Timeline */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Timeline</p>
          <div className="space-y-2 max-h-36 overflow-y-auto">
            {[...(order.timeline || [])].reverse().map((t, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="text-gray-300">{t.action}</span>
                  <span className="text-gray-600 text-xs ml-2">{fmtTs(t.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Comments</p>
          <div className="space-y-2 max-h-28 overflow-y-auto mb-3">
            {(order.notes || []).length === 0 && <p className="text-sm text-gray-600">No comments yet.</p>}
            {(order.notes || []).map((n, i) => (
              <div key={i} className="bg-[#0B0F1A] rounded-lg px-3 py-2">
                <p className="text-sm text-gray-300">{n.text}</p>
                <p className="text-xs text-gray-600 mt-0.5">{fmtTs(n.timestamp)}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={inp + " flex-1"} value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitNote()} placeholder="Add a comment…" />
            <button onClick={submitNote} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors">Add</button>
          </div>
        </div>

        {/* Share */}
        <div className="flex items-center gap-3 bg-[#0B0F1A] border border-[#1F2937] rounded-xl px-3 py-2">
          <Share2 size={13} className="text-gray-600" />
          <input readOnly value={shareUrl} className="flex-1 text-xs bg-transparent text-gray-600 font-mono" />
          <button onClick={() => navigator.clipboard?.writeText(shareUrl)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Copy</button>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onEdit} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"><Edit size={13} /> Edit</button>
          <button onClick={() => onToggleStar(order.id)} className="px-4 py-2.5 border border-[#1F2937] hover:bg-[#1F2937] text-gray-400 hover:text-white rounded-xl text-sm transition-colors">{order.starred ? "Unstar" : "★ Star"}</button>
          <button onClick={() => { if (window.confirm("Delete this order?")) { onDelete(order.id); onClose(); } }} className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm flex items-center gap-2 transition-colors"><Trash2 size={13} /></button>
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

  if (!order) return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-8">
      <div className="text-center">
        <Package className="mx-auto mb-4 text-gray-700" size={56} />
        <h2 className="text-xl font-semibold text-white mb-2">Order Not Found</h2>
        <p className="text-gray-500 mb-6 text-sm">No order with number: {orderNumber}</p>
        <button onClick={onBack} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors">← Back</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden shadow-2xl">
        <div className="border-b border-[#1F2937] p-6">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Order Tracking</p>
          <h1 className="text-xl font-bold text-white font-mono">{order.orderNumber}</h1>
          <p className="text-sm text-gray-400 mt-1">{order.productName}</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex items-start gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                    ${i < curStep ? "bg-emerald-500 border-emerald-500 text-white" : i === curStep ? "bg-indigo-600 border-indigo-600 text-white" : "bg-transparent border-[#374151] text-gray-600"}`}>
                    {i < curStep ? "✓" : i === curStep ? <span className="w-2 h-2 bg-white rounded-full block" /> : ""}
                  </div>
                  {i < STATUS_STEPS.length - 1 && <div className={`w-px h-8 mt-1 ${i < curStep ? "bg-emerald-500" : "bg-[#1F2937]"}`} />}
                </div>
                <div className="pt-1">
                  <p className={`font-medium text-sm ${i <= curStep ? "text-white" : "text-gray-600"}`}>{s}</p>
                  {i === curStep && <p className="text-xs text-indigo-400 mt-0.5">Current status</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t border-[#1F2937] pt-4 text-sm">
            {[["Customer", order.customerName], ["Courier", `${order.courierPartner}`], ["Expected", fmtDate(order.expectedDeliveryDate)]].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-200 font-medium">{v}</span>
              </div>
            ))}
          </div>
          <button onClick={onBack} className="w-full py-2.5 border border-[#1F2937] hover:bg-[#1F2937] text-gray-400 hover:text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"><Home size={13} /> Dashboard</button>
        </div>
      </div>
    </div>
  );
}

// ─── KPI CARDS ────────────────────────────────────────────────────────────────

function KPICards({ orders, onFilter }: { orders: Order[]; onFilter: (f: Record<string, unknown>) => void }) {
  const stats = useMemo(() => {
    const revenue = orders.filter((o) => o.orderType !== "Return").reduce((s, o) => s + Number(o.amount || 0), 0);
    const total = orders.length;
    const dispatched = orders.filter((o) => o.status === "Dispatched" || o.status === "Delivered").length;
    const processing = orders.filter((o) => o.status === "Processing").length;
    const packed = orders.filter((o) => o.status === "Packed").length;
    const shipped = orders.filter((o) => o.status === "Dispatched").length;
    const delivered = orders.filter((o) => o.status === "Delivered").length;
    const overdue = orders.filter(isOverdue).length;
    return { revenue, total, dispatched, processing, packed, shipped, delivered, overdue };
  }, [orders]);

  // Build last-30-day sparkline from order dates
  const sparkData = useMemo(() => {
    const days = 14;
    const buckets = Array(days).fill(0);
    const now = Date.now();
    orders.forEach((o) => {
      const diff = Math.floor((now - new Date(o.date).getTime()) / 86400000);
      if (diff >= 0 && diff < days) buckets[days - 1 - diff]++;
    });
    return buckets;
  }, [orders]);

  const dispatchRate = stats.total ? Math.round((stats.dispatched / stats.total) * 100) : 0;

  const topCards = [
    { label: "Total Revenue", value: fmtCurrency(stats.revenue), sub: `${stats.total} orders`, icon: null, filter: {}, isRevenue: true, sparkline: sparkData },
    { label: "Total Orders", value: stats.total, sub: "all time", icon: Package, filter: {} },
    { label: "Dispatch Rate", value: `${dispatchRate}%`, sub: `${stats.dispatched} shipped`, icon: Truck, filter: { status: ["Dispatched", "Delivered"] } },
  ];

  const bottomCards = [
    { label: "Processing", value: stats.processing, sub: "being prepared", icon: Clock, filter: { status: ["Processing"] } },
    { label: "Packed", value: stats.packed, sub: "ready to ship", icon: Package, filter: { status: ["Packed"] } },
    { label: "Shipped", value: stats.shipped, sub: "in transit", icon: Truck, filter: { status: ["Dispatched"] } },
    { label: "Delivered", value: stats.delivered, sub: "completed", icon: CheckCircle, filter: { status: ["Delivered"] } },
  ];

  return (
    <div className="mb-8 space-y-6">
      {/* Top Row — Revenue (2 cols) + Orders (1 col) + Dispatch (1 col) = 4 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {/* Total Revenue - spans 2 columns */}
        <button
          onClick={() => onFilter(topCards[0].filter)}
          className="md:col-span-2 xl:col-span-2 rounded-2xl p-5 sm:p-6 md:p-7 text-left shadow-md transition group"
          style={{
            background: 'var(--card)',
            boxShadow: 'var(--card-shadow)',
            color: 'var(--text)',
            border: 'none',
          }}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <p className="kpi-label mb-2">Total Revenue</p>
              <p className="kpi-value text-3xl">{topCards[0].value}</p>
              <p className="kpi-sub mt-2">{topCards[0].sub}</p>
            </div>
            <div className="hidden sm:block flex-shrink-0">
              <Sparkline data={topCards[0].sparkline || []} w={260} h={72} />
            </div>
          </div>
        </button>

        {/* Total Orders & Dispatch Rate - 1 col each */}
        {topCards.slice(1).map((c) => (
          <button
            key={c.label}
            onClick={() => onFilter(c.filter)}
            className="rounded-2xl p-5 sm:p-6 md:p-7 text-left shadow-md transition group"
            style={{
              background: 'var(--card)',
              boxShadow: 'var(--card-shadow)',
              color: 'var(--text)',
              border: 'none',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="kpi-label">{c.label}</p>
                {c.icon && (
                  <div className="p-1 rounded-lg transition-colors" style={{backgroundColor:'var(--bg-subtle)'}}>
                    <c.icon size={12} className="text-sub group-hover:text-indigo-400 transition-colors" />
                  </div>
                )}
              </div>
              <p className="kpi-value text-2xl">{c.value}</p>
              <p className="kpi-sub mt-2">{c.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Row — Secondary Metrics (4 equal cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {bottomCards.map((c) => (
          <button
            key={c.label}
            onClick={() => onFilter(c.filter)}
            className="rounded-2xl p-5 sm:p-6 md:p-7 text-left shadow-md transition group"
            style={{
              background: 'var(--card)',
              boxShadow: 'var(--card-shadow)',
              color: 'var(--text)',
              border: 'none',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="kpi-label">{c.label}</p>
              <div className="p-1 rounded-lg transition-colors" style={{backgroundColor:'var(--bg-subtle)'}}>
                <c.icon size={11} className="text-sub group-hover:text-indigo-400 transition-colors" />
              </div>
            </div>
            <p className="kpi-value text-xl">{c.value}</p>
            <p className="kpi-sub mt-2">{c.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────

interface Filters {
  status?: string[]; orderType?: string[]; courier?: string[];
  overdueOnly?: boolean; starredOnly?: boolean; dateRange?: string;
  dateFrom?: string; dateTo?: string; amountMin?: number; amountMax?: number;
  [key: string]: unknown;
}

function FilterBar({ filters, setFilters, presets, onSavePreset, onDeletePreset, onApplyPreset }: {
  filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  presets: FilterPreset[]; onSavePreset: (n: string) => void;
  onDeletePreset: (n: string) => void; onApplyPreset: (p: FilterPreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showPresetInput, setShowPresetInput] = useState(false);
  const toggle = (key: string, val: string) => {
    const arr = (filters[key] as string[]) || [];
    setFilters((p) => ({ ...p, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] }));
  };
  const hasFilters = Object.values(filters).some((v) => Array.isArray(v) ? v.length > 0 : v === true || (typeof v === "number" && v > 0));

  return (
    <div className="mb-4">
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {presets.map((p) => (
            <div key={p.name} className="flex items-center gap-1 bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 rounded-full px-2.5 py-1 text-xs font-medium">
              <button onClick={() => onApplyPreset(p)}>{p.name}</button>
              <button onClick={() => onDeletePreset(p.name)} className="hover:text-red-400 transition-colors ml-0.5"><X size={9} /></button>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
        <Filter size={13} />
        Filters
        {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="mt-3 bg-[#111827] border border-[#1F2937] rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Status</p>
            {ORDER_STATUSES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-1.5 cursor-pointer transition-colors">
                <input type="checkbox" className="accent-indigo-500" checked={(filters.status || []).includes(s)} onChange={() => toggle("status", s)} /> {s}
              </label>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Order Type</p>
            {ORDER_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-1.5 cursor-pointer transition-colors">
                <input type="checkbox" className="accent-indigo-500" checked={(filters.orderType || []).includes(t)} onChange={() => toggle("orderType", t)} /> {t}
              </label>
            ))}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2.5">Courier</p>
            {COURIERS.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-1.5 cursor-pointer transition-colors">
                <input type="checkbox" className="accent-indigo-500" checked={(filters.courier || []).includes(c)} onChange={() => toggle("courier", c)} /> {c}
              </label>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Date Range</p>
            <div className="space-y-1">
              {["Today", "This Week", "This Month", "Custom"].map((r) => (
                <button key={r} onClick={() => setFilters((p) => ({ ...p, dateRange: r === filters.dateRange ? undefined : r }))}
                  className={`block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${filters.dateRange === r ? "bg-indigo-600/20 text-indigo-400" : "text-gray-400 hover:bg-[#1F2937] hover:text-white"}`}>{r}</button>
              ))}
            </div>
            {filters.dateRange === "Custom" && (
              <div className="mt-2 space-y-1.5">
                <input type="date" value={filters.dateFrom || ""} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} className={inp} />
                <input type="date" value={filters.dateTo || ""} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} className={inp} />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Other</p>
            <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-2 cursor-pointer transition-colors">
              <input type="checkbox" className="accent-indigo-500" checked={!!filters.overdueOnly} onChange={(e) => setFilters((p) => ({ ...p, overdueOnly: e.target.checked }))} /> Overdue Only
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 cursor-pointer transition-colors">
              <input type="checkbox" className="accent-indigo-500" checked={!!filters.starredOnly} onChange={(e) => setFilters((p) => ({ ...p, starredOnly: e.target.checked }))} /> Starred Only
            </label>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Amount Range (₹)</p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1"><span>Min</span><span className="text-indigo-400">₹{(filters.amountMin ?? 0).toLocaleString("en-IN")}</span></div>
                <input type="range" min={0} max={100000} step={500} value={filters.amountMin ?? 0} onChange={(e) => setFilters((p) => ({ ...p, amountMin: Number(e.target.value) }))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1"><span>Max</span><span className="text-indigo-400">{(filters.amountMax ?? 100000) >= 100000 ? "₹1L+" : `₹${(filters.amountMax ?? 100000).toLocaleString("en-IN")}`}</span></div>
                <input type="range" min={0} max={100000} step={500} value={filters.amountMax ?? 100000} onChange={(e) => setFilters((p) => ({ ...p, amountMax: Number(e.target.value) }))} className="w-full accent-indigo-500" />
              </div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-4 flex items-center gap-3 pt-3 border-t border-[#1F2937]">
            {showPresetInput ? (
              <>
                <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name…" className={inp + " max-w-xs"} />
                <button onClick={() => { onSavePreset(presetName); setPresetName(""); setShowPresetInput(false); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">Save</button>
                <button onClick={() => setShowPresetInput(false)} className="text-sm text-gray-500 hover:text-gray-300">Cancel</button>
              </>
            ) : (
              <button onClick={() => setShowPresetInput(true)} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">+ Save as preset</button>
            )}
            <button onClick={() => setFilters({})} className="ml-auto text-sm text-gray-600 hover:text-red-400 transition-colors">Clear all</button>
          </div>
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
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const { orders, presets, darkMode, addOrder, deleteOrder, updateStatus, addNote, toggleStar, savePreset, deletePreset, toggleDarkMode } = useSalesStore();

  // Auto-mark orders as delivered after 10 days if still in Dispatched status
  useEffect(() => {
    const autoMarkDelivered = () => {
      const now = new Date();
      const ordersToUpdate = orders
        .filter((o) => o.status === "Dispatched" && o.date)
        .filter((o) => {
          const orderDate = new Date(o.date);
          const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff >= 10;
        })
        .map((o) => o.id);
      
      if (ordersToUpdate.length > 0) {
        updateStatus(ordersToUpdate, "Delivered");
      }
    };
    
    // Check on mount
    autoMarkDelivered();
    
    // Check every hour
    const interval = setInterval(autoMarkDelivered, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [orders, updateStatus]);

  const [searchQ, setSearchQ] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: "asc"|"desc" }[]>([{ col: "date", dir: "desc" }]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<{ type: string; data?: string } | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFabOpen, setMobileFabOpen] = useState(false);
  const [mobileMenuId, setMobileMenuId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Online/offline
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => { setIsOnline(true); addToast("Back online", "info"); };
    const off = () => { setIsOnline(false); addToast("Offline — changes saved locally", "warning"); };
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Hash routing
  useEffect(() => {
    const check = () => { const h = window.location.hash; setTrackingId(h.startsWith("#/track/") ? decodeURIComponent(h.slice(8)) : null); };
    check(); window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) { if (e.key === "Escape") (e.target as HTMLElement).blur(); return; }
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "n" || e.key === "N") setModal({ type: "newOrder" });
      if (e.key === "u" || e.key === "U") setModal({ type: "upload" });
      if (e.key === "?" ) setModal({ type: "shortcuts" });
      if (e.key === "Escape") { setModal(null); setMobileSearchOpen(false); setMobileFabOpen(false); setMobileMenuId(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Toast
  const addToast = useCallback((message: string, type = "info") => {
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `t_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id: string) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  // Order actions
  const handleAddOrder = useCallback((form: Partial<Order>, isEdit = false, editId?: string) => {
    addOrder(form, isEdit, editId);
    addToast(isEdit ? "Order updated" : "Order added", "success");
    setModal(null);
  }, [addOrder, addToast]);

  const handleDeleteOrder = useCallback((id: string) => {
    deleteOrder(id);
    setSelected((p) => { const n = new Set(p); n.delete(id); return n; });
    addToast("Order deleted", "delete");
  }, [deleteOrder, addToast]);

  const handlePrintLabel = useCallback((order: Order) => {
    if (!order.labelBase64 || !order.labelMimeType) {
      addToast("No uploaded PDF or image found for this order", "warning");
      return;
    }

    try {
      const byteCharacters = atob(order.labelBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: order.labelMimeType });
      const url = URL.createObjectURL(blob);

      const win = window.open(url, "_blank");
      if (!win) {
        addToast("Popup blocked. Allow popups to print the label.", "warning");
        return;
      }

      // For images, try to trigger print automatically
      if (order.labelMimeType !== "application/pdf") {
        win.onload = () => {
          win.print();
          // Optionally revoke the URL after printing
          // URL.revokeObjectURL(url);
        };
      }
    } catch (err) {
      console.error("Print error:", err);
      addToast("Failed to process label for printing", "error");
    }
  }, [addToast]);

  const handleParsed = useCallback((formData: Partial<Order>, action: "new"|"update", existingId?: string) => {
    if (action === "update" && existingId) handleAddOrder(formData, true, existingId);
    else handleAddOrder(formData, false);
  }, [handleAddOrder]);

  // Filtering + sorting
  const filteredOrders = useMemo(() => {
    let res = [...orders];
    const today = new Date().toDateString();
    if (searchQ) { const q = searchQ.toLowerCase(); res = res.filter((o) => [o.customerName, o.orderNumber, o.courierAWB, o.sku, o.productName, o.pincode].some((f) => f?.toLowerCase().includes(q))); }
    if (filters.status?.length) res = res.filter((o) => filters.status!.includes(o.status));
    if (filters.orderType?.length) res = res.filter((o) => filters.orderType!.includes(o.orderType));
    if (filters.courier?.length) res = res.filter((o) => filters.courier!.includes(o.courierPartner));
    if (filters.overdueOnly) res = res.filter(isOverdue);
    if (filters.starredOnly) res = res.filter((o) => o.starred);
    if (filters.amountMin != null && filters.amountMin > 0) res = res.filter((o) => Number(o.amount) >= filters.amountMin!);
    if (filters.amountMax != null && filters.amountMax < 100000) res = res.filter((o) => Number(o.amount) <= filters.amountMax!);
    if (filters.dateRange === "Today") res = res.filter((o) => new Date(o.date).toDateString() === today);
    if (filters.dateRange === "This Week") { const d = new Date(); d.setDate(d.getDate() - 7); res = res.filter((o) => new Date(o.date) >= d); }
    if (filters.dateRange === "This Month") { const d = new Date(); d.setDate(1); res = res.filter((o) => new Date(o.date) >= d); }
    if (filters.dateRange === "Custom") {
      if (filters.dateFrom) res = res.filter((o) => o.date >= filters.dateFrom!);
      if (filters.dateTo) res = res.filter((o) => o.date <= filters.dateTo!);
    }
    res.sort((a, b) => {
      if (a.starred && !b.starred) return -1; if (!a.starred && b.starred) return 1;
      for (const { col, dir } of sortConfig) {
        const va = (a as unknown as Record<string, unknown>)[col] ?? "";
        const vb = (b as unknown as Record<string, unknown>)[col] ?? "";
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return res;
  }, [orders, searchQ, filters, sortConfig]);

  const handleSort = (col: string, shift: boolean) => {
    setSortConfig((prev) => {
      if (shift) { const i = prev.findIndex((s) => s.col === col); if (i >= 0) { const c = [...prev]; c[i] = { col, dir: c[i].dir === "asc" ? "desc" : "asc" }; return c; } return [...prev, { col, dir: "asc" }]; }
      const cur = prev.find((s) => s.col === col);
      return [{ col, dir: cur?.dir === "asc" ? "desc" : "asc" }];
    });
  };

  // Bulk
  const selectedArr = useMemo(() => [...selected], [selected]);
  const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selected.has(o.id));

  const applyBulkStatus = () => {
    if (!bulkStatus || !selectedArr.length) return;
    updateStatus(selectedArr, bulkStatus as Order["status"]);
    addToast(`Status → ${bulkStatus}`, "success");
    setSelected(new Set()); setBulkStatus("");
  };

  // Export
  const exportCSV = (data: Order[], filename = "orders.csv") => {
    const cols = ["orderNumber","customerName","productName","sku","amount","status","orderType","courierPartner","courierAWB","date","expectedDeliveryDate","pincode"] as (keyof Order)[];
    const rows = data.map((o) => cols.map((c) => `"${(o[c] ?? "").toString().replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    addToast("CSV exported", "export");
  };
  const exportExcel = async (data: Order[]) => {
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(data.map((o) => ({ "Order No.": o.orderNumber, Customer: o.customerName, Product: o.productName, SKU: o.sku, "Amount (₹)": o.amount, Status: o.status, Type: o.orderType, Courier: o.courierPartner, AWB: o.courierAWB, Date: o.date })));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Orders"); XLSX.writeFile(wb, "orders.xlsx");
      addToast("Excel exported", "export");
    } catch { addToast("Excel export failed", "error"); }
  };

  // Sort icon
  const SortIcon = ({ col }: { col: string }) => {
    const s = sortConfig.find((x) => x.col === col);
    if (!s) return <ArrowUp size={10} className="text-gray-700" />;
    return s.dir === "asc" ? <ArrowUp size={10} className="text-indigo-400" /> : <ArrowDown size={10} className="text-indigo-400" />;
  };

  const activeOrder = (modal?.type === "view" || modal?.type === "edit") ? orders.find((o) => o.id === modal?.data) : null;

  if (trackingId) return <TrackingPage orderNumber={trackingId} orders={orders} onBack={() => { window.location.hash = ""; }} />;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs text-center py-2 flex items-center justify-center gap-2">
          <WifiOff size={12} /> Offline — changes saved to IndexedDB
        </div>
      )}

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 backdrop-blur-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 80%, transparent)', borderColor: 'var(--border)' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Package size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm" style={{color:'var(--text)'}}>SalesTracker</span>
          </div>

          {/* Search — centered */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="relative w-full max-w-md">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                ref={searchRef}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder='Search orders… ("/" to focus)'
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                style={{ backgroundColor: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)', '--placeholder-color': 'var(--text-sub)' } as any}
              />
              {searchQ && <button onClick={() => setSearchQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"><X size={12} /></button>}
            </div>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-auto">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg transition-colors btn-ghost"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={() => setModal({ type: "upload" })} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors btn-ghost">
              <Upload size={13} /> Upload PDF
            </button>
            <button onClick={() => setModal({ type: "newOrder" })} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors">
              <Plus size={13} /> New Order
            </button>
            <button onClick={() => setModal({ type: "shortcuts" })} className="p-2 rounded-lg transition-colors btn-ghost" title="Keyboard shortcuts">
              <Keyboard size={15} />
            </button>
            <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border)' }}></div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-xl transition-colors" title="Logout">
              <LogOut size={13} /> Logout
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden ml-auto">
            <button
              onClick={() => { setMobileSearchOpen((prev) => !prev); setMobileFabOpen(false); }}
              className="p-2 rounded-lg transition-colors btn-ghost"
              title="Search orders"
            >
              <Search size={15} />
            </button>
            <button onClick={toggleDarkMode} className="p-2 rounded-lg transition-colors btn-ghost" title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={() => setModal({ type: "shortcuts" })} className="p-2 rounded-lg transition-colors btn-ghost" title="Keyboard shortcuts">
              <Keyboard size={15} />
            </button>
          </div>
        </div>

          {mobileSearchOpen && (
            <div className="md:hidden">
              <div className="relative w-full">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  ref={searchRef}
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder='Search orders…'
                  className="w-full pl-9 pr-10 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  style={{ backgroundColor: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)', '--placeholder-color': 'var(--text-sub)' } as any}
                />
                {searchQ && <button onClick={() => setSearchQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"><X size={12} /></button>}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6">

        {/* KPI Cards */}
        <KPICards orders={orders} onFilter={(f) => setFilters(f as Filters)} />

        {/* Table card */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}>

          {/* Table toolbar */}
          <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
                {searchQ && <span className="text-sub"> for "{searchQ}"</span>}
              </span>
              <FilterBar filters={filters} setFilters={setFilters} presets={presets}
                onSavePreset={(n) => { savePreset(n, filters as Record<string, unknown>); addToast(`Preset "${n}" saved`, "success"); }}
                onDeletePreset={deletePreset}
                onApplyPreset={(p) => setFilters(p.filters as Filters)}
              />
            </div>
            <div className="relative">
              <button onClick={() => setExportOpen(!exportOpen)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors btn-ghost">
                <Download size={13} /> Export <ChevronDown size={11} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-1 rounded-xl shadow-2xl z-20 w-52 overflow-hidden" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}>
                  {[["All orders (CSV)", () => exportCSV(orders, "all-orders.csv")], ["Filtered (CSV)", () => exportCSV(filteredOrders)], ["Excel (.xlsx)", () => exportExcel(filteredOrders)]].map(([l, fn]) => (
                    <button key={l as string} onClick={() => { (fn as () => void)(); setExportOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-opacity-50" style={{ color: 'var(--text-muted)', '--hover-bg': 'var(--border)' } as any} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>{l as string}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bulk bar */}
          {selected.size > 0 && (
            <div className="px-6 py-3 bg-indigo-600/5 border-b border-indigo-600/20 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-indigo-400">{selected.size} selected</span>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className={sel + " max-w-[180px] py-1.5"}>
                <option value="">Change status…</option>
                {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button onClick={applyBulkStatus} disabled={!bulkStatus} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm rounded-lg font-medium transition-colors">Apply</button>
              <button onClick={() => exportCSV(filteredOrders.filter((o) => selected.has(o.id)))} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-[#1F2937] hover:border-[#374151] rounded-lg transition-colors">Export CSV</button>
              <button onClick={() => { selectedArr.forEach((id) => toggleStar(id)); setSelected(new Set()); }} className="px-3 py-1.5 text-sm text-gray-400 hover:text-amber-400 border border-[#1F2937] rounded-lg transition-colors">★ Star</button>
              <button onClick={() => { if (window.confirm(`Delete ${selectedArr.length} orders?`)) { selectedArr.forEach((id) => deleteOrder(id)); setSelected(new Set()); addToast(`${selectedArr.length} deleted`, "delete"); } }} className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-[#1F2937] rounded-lg transition-colors">Delete</button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-600 hover:text-gray-400"><X size={13} /></button>
            </div>
          )}

          {/* ── MOBILE CARDS ───────────────────────────────────────────────── */}
          <div className="block md:hidden px-4 pb-4 space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-[#1F2937] bg-[#111827] p-8 text-center">
                <Package className="mx-auto mb-3 text-gray-700" size={36} />
                <p className="text-gray-400 font-medium mb-1">No orders found</p>
                <p className="text-sm text-gray-600">
                  {searchQ ? `No results for "${searchQ}"` : "Upload your first PDF to get started 🚀"}
                </p>
              </div>
            ) : filteredOrders.map((o) => {
              const overdue = isOverdue(o);
              const isMenuOpen = mobileMenuId === o.id;
              return (
                <article
                  key={o.id}
                  className={`rounded-2xl border p-4 shadow-sm ${overdue ? "border-red-500/20 bg-red-500/5" : "border-[#1F2937] bg-[#111827]"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        className="mt-1 accent-indigo-500"
                        checked={selected.has(o.id)}
                        onChange={(e) => {
                          const n = new Set(selected);
                          e.target.checked ? n.add(o.id) : n.delete(o.id);
                          setSelected(n);
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Order ID</p>
                        <p className="mt-0.5 font-mono text-sm font-semibold text-gray-100 truncate">{o.orderNumber}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setMobileMenuId(isMenuOpen ? null : o.id)}
                      className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#1F2937] transition-colors"
                      aria-label="Order actions"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-white truncate">{o.customerName}</p>
                      {o.customerPhone && <p className="text-xs text-gray-500 mt-0.5">{o.customerPhone}</p>}
                    </div>
                    <p className="text-xl font-black text-white whitespace-nowrap">{fmtCurrency(o.amount)}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={o.status} />
                    {o.starred && <span className="text-xs text-amber-400">★ Starred</span>}
                    {overdue && <span className="text-xs text-red-400 font-medium">Overdue</span>}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500 mb-0.5">Date</p>
                      <p className="text-gray-200 font-medium">{fmtDate(o.date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-0.5">Product</p>
                      <p className="text-gray-200 font-medium truncate" title={o.productName}>{o.productName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-0.5">SKU</p>
                      <p className="text-gray-200 font-mono truncate">{o.sku}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-0.5">Customer</p>
                      <p className="text-gray-200 font-medium truncate">{o.customerName}</p>
                    </div>
                  </div>

                  {isMenuOpen && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-[#1F2937] bg-[#0B0F1A]">
                      <button onClick={() => { setModal({ type: "view", data: o.id }); setMobileMenuId(null); }} className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-[#1F2937] transition-colors">View</button>
                      <button onClick={() => { setModal({ type: "edit", data: o.id }); setMobileMenuId(null); }} className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-[#1F2937] transition-colors border-t border-[#1F2937]">Edit</button>
                      <button onClick={() => { if (window.confirm("Delete this order?")) handleDeleteOrder(o.id); setMobileMenuId(null); }} className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-[#1F2937]">Delete</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* ── TABLE ──────────────────────────────────────────────────────── */}
          <div className="hidden md:block overflow-x-auto" style={{ maxHeight: "calc(100vh - 320px)", overflowY: "auto" }}>
            <table className="w-full text-sm" style={{backgroundColor:'var(--card)'}}>
              <thead className="sticky top-0 z-10" style={{backgroundColor:'var(--table-head-bg)'}}>
                <tr style={{borderBottom:'1px solid var(--table-divider)'}}>
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox" className="accent-indigo-500" checked={allSelected}
                      onChange={(e) => setSelected(e.target.checked ? new Set(filteredOrders.map((o) => o.id)) : new Set())} />
                  </th>
                  <th className="px-2 py-3 w-5" />
                  {[ ["date","Date"],["orderNumber","Order ID"],["customerName","Customer"],["productName","Product"],["sku","SKU"],["amount","Amount"],["status","Status"]].map(([col, label]) => (
                    <th key={col} onClick={(e) => handleSort(col, e.shiftKey)}
                      className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer whitespace-nowrap select-none transition-colors hover:text-indigo-500"
                      style={{color:'var(--text-sub)'}}>
                      <div className="flex items-center gap-1">{label}<SortIcon col={col} /></div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{color:'var(--text-sub)'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <Package className="mx-auto mb-4 text-gray-700" size={40} />
                      <p className="text-gray-400 font-medium mb-1">No orders found</p>
                      <p className="text-sm text-gray-600">
                        {searchQ ? `No results for "${searchQ}"` : "Upload your first PDF to get started 🚀"}
                      </p>
                    </td>
                  </tr>
                ) : filteredOrders.map((o) => {
                  const overdue = isOverdue(o);
                  return (
                    <tr key={o.id}
                      className={`group transition-colors even:bg-[#F9FAFB] hover:bg-gray-50 ${overdue ? "bg-red-50" : ""}`}
                      style={{ borderBottom: '1px solid #E5E7EB' }}
                      onDoubleClick={() => setModal({ type: "view", data: o.id })}
                    >
                      <td className="px-4 py-3.5">
                        <input type="checkbox" className="accent-indigo-500" checked={selected.has(o.id)}
                          onChange={(e) => { const n = new Set(selected); e.target.checked ? n.add(o.id) : n.delete(o.id); setSelected(n); }} />
                      </td>
                      <td className="px-2 py-3.5 text-center">
                        {o.starred ? <Star size={12} className="text-amber-400 fill-amber-400" /> : overdue ? <AlertTriangle size={12} className="text-red-500" /> : null}
                      </td>
                      <td className="px-3 py-3.5 text-gray-500 text-xs whitespace-nowrap">{fmtDate(o.date)}</td>
                      <td className="px-3 py-3.5">
                        <span className="font-mono text-xs font-medium text-gray-700 hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => setModal({ type: "view", data: o.id })}>{o.orderNumber}</span>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">{o.customerName}</p>
                        {o.customerPhone && <p className="text-xs text-gray-500">{o.customerPhone}</p>}
                      </td>
                      <td className="px-3 py-3.5 max-w-[160px]">
                        <p className="text-xs text-gray-600 truncate" title={o.productName}>{o.productName}</p>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">{o.sku}</td>
                      <td className="px-3 py-3.5 font-semibold text-gray-900 whitespace-nowrap text-sm">{fmtCurrency(o.amount)}</td>
                      <td className="px-3 py-3.5"><StatusBadge status={o.status} /></td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button onClick={() => setModal({ type: "view", data: o.id })} className="p-1.5 hover:bg-[#374151] rounded-lg text-gray-600 hover:text-gray-300 transition-colors" title="View"><Eye size={13} /></button>
                          <button onClick={() => setModal({ type: "edit", data: o.id })} className="p-1.5 hover:bg-[#374151] rounded-lg text-gray-600 hover:text-gray-300 transition-colors" title="Edit"><Edit size={13} /></button>
                          <button onClick={() => handlePrintLabel(o)} className={`p-1.5 rounded-lg transition-colors ${o.labelBase64 ? "hover:bg-indigo-500/10 text-gray-600 hover:text-indigo-400" : "text-gray-700 opacity-50 cursor-not-allowed"}`} title={o.labelBase64 ? "Print uploaded label" : "No uploaded label"} disabled={!o.labelBase64}><Printer size={13} /></button>
                          <button onClick={() => { if (window.confirm("Delete this order?")) handleDeleteOrder(o.id); }} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-600 hover:text-red-400 transition-colors" title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="hidden md:flex px-6 py-3 border-t border-[#1F2937] items-center justify-between text-xs text-gray-600">
            <span>{orders.length} total orders · Cloud persistence · <button onClick={() => setModal({ type: "shortcuts" })} className="hover:text-gray-400 underline">shortcuts</button></span>
            <span className="flex items-center gap-1.5">
              {isOnline ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online</> : <><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Offline</>}
            </span>
          </div>
        </div>
      </main>

      <div className="md:hidden fixed bottom-5 right-5 z-40">
        {mobileFabOpen && (
          <div className="mb-3 flex flex-col gap-2 items-end">
            <button onClick={() => { setModal({ type: "upload" }); setMobileFabOpen(false); }} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#111827] border border-[#1F2937] text-sm font-medium text-gray-200 shadow-2xl">
              <Upload size={13} /> Upload PDF
            </button>
            <button onClick={() => { setModal({ type: "newOrder" }); setMobileFabOpen(false); }} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 text-sm font-semibold text-white shadow-2xl">
              <Plus size={13} /> New Order
            </button>
          </div>
        )}
        <button
          onClick={() => setMobileFabOpen((prev) => !prev)}
          className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-2xl flex items-center justify-center border border-indigo-500/40"
          aria-label="Open quick actions"
        >
          <Plus size={20} className={`transition-transform ${mobileFabOpen ? "rotate-45" : "rotate-0"}`} />
        </button>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}

      <Modal open={modal?.type === "newOrder"} onClose={() => setModal(null)} title="New Order" size="max-w-3xl">
        <OrderForm initial={EMPTY_ORDER} onSave={(f) => handleAddOrder(f, false)} onCancel={() => setModal(null)} />
      </Modal>

      {modal?.type === "edit" && activeOrder && (
        <Modal open onClose={() => setModal(null)} title={`Edit — ${activeOrder.orderNumber}`} size="max-w-3xl">
          <OrderForm initial={activeOrder} onSave={(f) => handleAddOrder(f, true, activeOrder.id)} onCancel={() => setModal(null)} isEdit />
        </Modal>
      )}

      {modal?.type === "view" && activeOrder && (
        <OrderDetailModal order={activeOrder} onClose={() => setModal(null)}
          onEdit={() => setModal({ type: "edit", data: activeOrder.id })}
          onDelete={(id) => { handleDeleteOrder(id); setModal(null); }}
          onAddNote={addNote} onToggleStar={toggleStar}
        />
      )}

      <Modal open={modal?.type === "upload"} onClose={() => setModal(null)} title="AI Label Reader" size="max-w-xl">
        <PDFUploader existingOrders={orders} onParsed={handleParsed} addToast={addToast} onClose={() => setModal(null)} />
        <div className="mt-4 pt-4 border-t border-[#1F2937]">
          <button onClick={() => setModal({ type: "newOrder" })} className="w-full py-2.5 border border-dashed border-[#1F2937] hover:border-indigo-500/50 text-gray-600 hover:text-gray-400 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <Plus size={13} /> Add Manually Instead
          </button>
        </div>
      </Modal>

      {modal?.type === "shortcuts" && (
        <Modal open onClose={() => setModal(null)} title="Keyboard Shortcuts" size="max-w-sm">
          <div className="space-y-1">
            {[["/","Focus search"],["N","New order"],["U","Upload PDF"],["?","Show shortcuts"],["Esc","Close modal"],["Double-click row","View order"]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-[#1F2937] last:border-0">
                <span className="text-sm text-gray-400">{v}</span>
                <kbd className="px-2 py-1 bg-[#1F2937] text-gray-300 rounded text-xs font-mono">{k}</kbd>
              </div>
            ))}
          </div>
        </Modal>
      )}

      <ToastContainer toasts={toasts} remove={removeToast} />
    </div>
  );
}
