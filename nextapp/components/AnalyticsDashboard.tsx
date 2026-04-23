"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft, Download, RefreshCw,
  TrendingUp, TrendingDown, Package, CreditCard, Clock,
  CheckCircle, Users, BarChart3,
  Activity, Sparkles, Filter, Search,
  MoreHorizontal, AlertTriangle, ArrowRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, Treemap, ComposedChart
} from "recharts";
import type { Order } from "@/lib/store";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type DateRange = "Today" | "7D" | "30D" | "90D" | "1Y" | "Custom";

interface AnalyticsProps {
  open: boolean;
  onClose: () => void;
  orders: Order[];
  darkMode: boolean;
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const getDaysInRange = (range: DateRange, customFrom?: string, customTo?: string): number => {
  if (range === "Today") return 1;
  if (range === "7D") return 7;
  if (range === "30D") return 30;
  if (range === "90D") return 90;
  if (range === "1Y") return 365;
  if (range === "Custom" && customFrom && customTo) {
    const diff = new Date(customTo).getTime() - new Date(customFrom).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  return 30;
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

const COLORS = {
  primary: "#6366f1", // indigo
  secondary: "#8b5cf6", // violet
  success: "#10b981", // emerald
  warning: "#f59e0b", // amber
  danger: "#ef4444", // red
  info: "#0ea5e9", // sky
  muted: "#9ca3af",
};

const STATUS_COLORS: Record<string, string> = {
  Processing: COLORS.warning,
  Packed: COLORS.secondary,
  Dispatched: COLORS.info,
  Delivered: COLORS.success,
  Cancelled: COLORS.danger,
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const KPICard = ({
  label, value, trend, trendValue, icon: Icon, color, sparkData
}: {
  label: string; value: string | number; sub: string; trend: "up" | "down" | "neutral";
  trendValue?: string; icon: React.ElementType; color: string; sparkData?: { val: number }[];
}) => (
  <div className={`flex-shrink-0 w-64 p-5 rounded-2xl border transition-all duration-300 card-token`}
       style={{ borderLeftWidth: '4px', borderLeftColor: color }}>
    <div className="flex justify-between items-start mb-4">
      <p className="kpi-label">{label}</p>
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
        <Icon size={16} style={{ color }} />
      </div>
    </div>
    <h3 className="text-2xl font-extrabold mb-1" style={{ color: "var(--text)" }}>{value}</h3>
    <div className="flex items-center gap-2">
      <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        trend === "up" ? "bg-emerald-500/10 text-emerald-500" :
        trend === "down" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
      }`}>
        {trend === "up" ? <TrendingUp size={10} className="mr-1" /> :
         trend === "down" ? <TrendingDown size={10} className="mr-1" /> : <ArrowRight size={10} className="mr-1" />}
        {trendValue || "0%"}
      </div>
      <span className="text-[10px]" style={{ color: "var(--text-sub)" }}>vs prev period</span>
    </div>
    {sparkData && (
      <div className="mt-4 h-8 w-full opacity-50">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData}>
            <Line type="monotone" dataKey="val" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const SectionTitle = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>{title}</h2>
    {sub && <p className="text-sm" style={{ color: "var(--text-sub)" }}>{sub}</p>}
  </div>
);

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard({ open, onClose, orders }: AnalyticsProps) {
  const [range, setRange] = useState<DateRange>("30D");
  const [compare, setCompare] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeRevenueTab, setActiveRevenueTab] = useState<"Revenue" | "Order Count" | "Avg Value">("Revenue");
  const [productTab, setProductTab] = useState<"performance" | "sku" | "treemap">("performance");

  // Logic to process data based on range
  const analyticsData = useMemo(() => {
    const now = new Date();
    const daysCount = getDaysInRange(range);
    
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - daysCount);
    currentStart.setHours(0, 0, 0, 0);
    
    const prevStart = new Date(currentStart);
    prevStart.setDate(currentStart.getDate() - daysCount);

    const filterByDate = (os: Order[], start: Date, end: Date) => 
      os.filter(o => {
        const d = new Date(o.date);
        return d >= start && d <= end;
      });

    const curr = filterByDate(orders, currentStart, now);
    const prev = filterByDate(orders, prevStart, currentStart);

    // Helper: KPI Calculations
    const calcKPIs = (os: Order[]) => {
      const revenue = os.reduce((acc, o) => acc + (o.orderType !== "Return" ? Number(o.amount || 0) : 0), 0);
      const count = os.length;
      const avg = count ? revenue / count : 0;
      const dispatched = os.filter(o => ["Dispatched", "Delivered"].includes(o.status)).length;
      const pending = os.filter(o => ["Processing", "Packed"].includes(o.status)).length;
      const delivered = os.filter(o => o.status === "Delivered").length;
      
      const customers = new Set(os.map(o => o.customerPhone || o.customerName));
      const repeatRate = count ? ((count - customers.size) / count) * 100 : 0;

      return { revenue, count, avg, dispatchRate: count ? (dispatched / count) * 100 : 0, pending, delivered, repeatRate };
    };

    const currKPIs = calcKPIs(curr);
    const prevKPIs = calcKPIs(prev);

    const getTrend = (c: number, p: number) => {
      if (!p) return { type: "neutral" as const, val: "0%" };
      const pct = ((c - p) / p) * 100;
      return { 
        type: pct > 0 ? "up" as const : pct < 0 ? "down" as const : "neutral" as const,
        val: `${Math.abs(pct).toFixed(1)}%`
      };
    };

    // Sparkline data
    const getSparkline = (os: Order[], key: "revenue" | "count") => {
      const sparks = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayOrders = os.filter(o => new Date(o.date).toDateString() === d.toDateString());
        sparks.push({ val: key === "revenue" ? dayOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0) : dayOrders.length });
      }
      return sparks;
    };

    // Daily and Cumulative Data
    const dailyMap = new Map();
    const heatmapMap = new Map();
    
    for (let i = daysCount; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dailyMap.set(key, { date: key, revenue: 0, orders: 0 });
        heatmapMap.set(key, { date: key, revenue: 0, orders: 0 });
    }

    curr.forEach(o => {
      const d = o.date;
      if (dailyMap.has(d)) {
        const entry = dailyMap.get(d);
        entry.revenue += (o.orderType !== "Return" ? Number(o.amount || 0) : 0);
        entry.orders += 1;
      }
    });

    const dailyArr = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        displayDate: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        avgValue: d.orders ? d.revenue / d.orders : 0
      }));

    // Add 7-day moving average & cumulative
    let runningTotalAcc = 0;
    const dailyWithMAAndCum = dailyArr.map((d, i) => {
      const slice = dailyArr.slice(Math.max(0, i - 6), i + 1);
      const ma = slice.reduce((acc, curr) => acc + curr.revenue, 0) / slice.length;
      runningTotalAcc += d.revenue;
      return { ...d, ma, cumulative: runningTotalAcc };
    });

    // Pipeline Data
    const funnel = [
      { name: "Total Ordered", value: curr.length, color: COLORS.primary },
      { name: "Processing", value: curr.filter(o => ["Processing", "Packed", "Dispatched", "Delivered"].includes(o.status)).length, color: COLORS.secondary },
      { name: "Packed", value: curr.filter(o => ["Packed", "Dispatched", "Delivered"].includes(o.status)).length, color: COLORS.warning },
      { name: "Shipped", value: curr.filter(o => ["Dispatched", "Delivered"].includes(o.status)).length, color: COLORS.info },
      { name: "Delivered", value: curr.filter(o => o.status === "Delivered").length, color: COLORS.success },
    ];

    const statusCounts = curr.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusPie = Object.entries(statusCounts).map(([name, value]) => ({ 
      name, 
      value,
      revenue: curr.filter(o => o.status === name).reduce((acc, o) => acc + (o.orderType !== "Return" ? Number(o.amount || 0) : 0), 0)
    }));

    // SKU Performance
    const skuMap = curr.reduce((acc, o) => {
      const key = o.sku || "N/A";
      if (!acc[key]) acc[key] = { sku: key, name: o.productName, qty: 0, revenue: 0 };
      acc[key].qty += 1;
      acc[key].revenue += (o.orderType !== "Return" ? Number(o.amount || 0) : 0);
      return acc;
    }, {} as Record<string, { sku: string; name: string; qty: number; revenue: number }>);
    const skus = Object.values(skuMap).sort((a, b) => b.revenue - a.revenue);

    // Day of Week
    const daysNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dow = daysNames.map(d => ({ day: d, orders: 0, revenue: 0 }));
    curr.forEach(o => {
      const d = new Date(o.date).getDay();
      dow[d].orders += 1;
      dow[d].revenue += (o.orderType !== "Return" ? Number(o.amount || 0) : 0);
    });

    // Heatmap (Last 35 days)
    const heatmap = [];
    const hNow = new Date();
    for (let i = 34; i >= 0; i--) {
        const d = new Date(hNow);
        d.setDate(hNow.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const dayOrders = curr.filter(o => o.date === key);
        heatmap.push({
            date: d,
            key,
            revenue: dayOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0),
            count: dayOrders.length
        });
    }

    // Insights
    const ins = [];
    if (currKPIs.dispatchRate < 50 && curr.length > 0) {
      ins.push({ type: "warning", label: "Fulfillment Bottleneck", text: `${Math.round(100 - currKPIs.dispatchRate)}% of orders are stuck in Processing/Packed.`, icon: AlertTriangle, color: COLORS.warning });
    }
    const topProd = skus[0];
    if (topProd && currKPIs.revenue > 0) {
      ins.push({ type: "info", label: "Top Performer", text: `${topProd.name} is driving ${Math.round((topProd.revenue / currKPIs.revenue) * 100)}% of revenue.`, icon: Sparkles, color: COLORS.primary });
    }
    if (currKPIs.repeatRate === 0 && curr.length > 5) {
      ins.push({ type: "danger", label: "Retention Risk", text: "Zero repeat customers found. Consider adding a voucher for next purchase.", icon: Users, color: COLORS.danger });
    }
    const activeDaysCount = dailyArr.filter(d => d.orders > 0).length;
    ins.push({ type: "info", label: "Revenue Velocity", text: `₹${Math.round(currKPIs.revenue / (activeDaysCount || 1))}/day over ${activeDaysCount} active days.`, icon: Activity, color: COLORS.info });

    return { 
      currentOrders: curr,
      dailyData: dailyWithMAAndCum,
      kpis: {
        revenue: { val: currKPIs.revenue, trend: getTrend(currKPIs.revenue, prevKPIs.revenue), spark: getSparkline(curr, "revenue") },
        orders: { val: currKPIs.count, trend: getTrend(currKPIs.count, prevKPIs.count), spark: getSparkline(curr, "count") },
        avgValue: { val: currKPIs.avg, trend: getTrend(currKPIs.avg, prevKPIs.avg) },
        dispatch: { val: currKPIs.dispatchRate, trend: getTrend(currKPIs.dispatchRate, prevKPIs.dispatchRate) },
        pending: { val: currKPIs.pending, trend: getTrend(currKPIs.pending, prevKPIs.pending) },
        delivered: { val: currKPIs.delivered, trend: getTrend(currKPIs.delivered, prevKPIs.delivered) },
        repeat: { val: currKPIs.repeatRate, trend: getTrend(currKPIs.repeatRate, prevKPIs.repeatRate) },
        revPerDay: { val: currKPIs.revenue / (daysCount || 1), trend: { type: "neutral" as const, val: "0%" } }
      },
      funnelData: funnel,
      statusData: statusPie,
      skuPerformance: skus,
      dayOfWeekData: dow,
      heatmapData: heatmap,
      insights: ins,
      orderAudit: curr.sort((a,b) => b.date.localeCompare(a.date))
    };
  }, [orders, range]);

  const { currentOrders, dailyData, kpis, funnelData, statusData, skuPerformance, dayOfWeekData, heatmapData, insights, orderAudit } = analyticsData;

  if (!open) return null;

  const exportCSV = () => {
    const cols = ["date", "orderNumber", "customerName", "productName", "amount", "status"];
    const rows = currentOrders.map(o => [o.date, o.orderNumber, o.customerName, o.productName, o.amount, o.status].map(v => `"${v}"`).join(","));
    const blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sales_analytics_${range}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col theme-transition bg-app animate-in fade-in duration-300`}>
      {/* ── TOP NAVIGATION ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b bg-header-bg backdrop-blur-xl border-token">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-xl btn-ghost hover:scale-105 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                <span>Dashboard</span>
                <ArrowRight size={8} />
                <span className="text-accent">Analytics & Intelligence</span>
             </div>
             <h1 className="text-lg font-black" style={{ color: "var(--text)" }}>Executive Dashboard</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-subtle p-1 rounded-xl border border-token shadow-inner">
            {(["Today", "7D", "30D", "90D", "1Y"] as DateRange[]).map((t) => (
              <button 
                key={t}
                onClick={() => setRange(t)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  range === t ? "bg-card text-accent shadow-sm" : "text-muted hover:text-main"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-token mx-1" />

          <button 
            onClick={() => setCompare(!compare)}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
              compare ? "border-indigo-500/50 bg-indigo-500/5 text-indigo-500" : "border-token text-muted"
            }`}
          >
            Compare Mode <div className={`w-8 h-4 rounded-full relative transition-all ${compare ? "bg-indigo-500" : "bg-muted/30"}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${compare ? "right-0.5" : "left-0.5"}`} />
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="p-2.5 rounded-xl btn-ghost group hover:text-indigo-500">
                <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
            </button>
            <button onClick={() => setLastUpdated(new Date())} className="flex items-center gap-2 px-3 py-2 rounded-xl btn-ghost text-[10px] font-black uppercase tracking-widest group">
                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                <span className="hidden sm:inline">Last Sync: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto p-6 space-y-10 max-w-[1600px] mx-auto w-full pb-20">
        
        {/* ── SECTION 1: KPI STRIP ── */}
        <section>
          <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar -mx-2 px-2 scroll-smooth">
            <KPICard label="Gross Revenue" value={fmtCurrency(kpis.revenue.val)} sub="Total Sales" trend={kpis.revenue.trend.type} trendValue={kpis.revenue.trend.val} icon={CreditCard} color={COLORS.primary} sparkData={kpis.revenue.spark} />
            <KPICard label="Total Orders" value={kpis.orders.val} sub="Volume" trend={kpis.orders.trend.type} trendValue={kpis.orders.trend.val} icon={Package} color={COLORS.secondary} sparkData={kpis.orders.spark} />
            <KPICard label="Avg Order Value" value={fmtCurrency(kpis.avgValue.val)} sub="AOV" trend={kpis.avgValue.trend.type} trendValue={kpis.avgValue.trend.val} icon={BarChart3} color={COLORS.info} />
            <KPICard label="Dispatch Rate" value={`${Math.round(kpis.dispatch.val)}%`} sub="Efficiency" trend={kpis.dispatch.trend.type} trendValue={kpis.dispatch.trend.val} icon={TrendingUp} color={COLORS.success} />
            <KPICard label="Fulfillment Pending" value={kpis.pending.val} sub="Backlog" trend={kpis.pending.trend.type === "up" ? "down" : "up"} trendValue={kpis.pending.trend.val} icon={Clock} color={COLORS.warning} />
            <KPICard label="Delivered" value={kpis.delivered.val} sub="Completion" trend={kpis.delivered.trend.type} trendValue={kpis.delivered.trend.val} icon={CheckCircle} color={COLORS.success} />
            <KPICard label="Repeat Rate" value={`${Math.round(kpis.repeat.val)}%`} sub="Retention" trend={kpis.repeat.trend.type} trendValue={kpis.repeat.trend.val} icon={Users} color={COLORS.secondary} />
            <KPICard label="Revenue/Day" value={fmtCurrency(kpis.revPerDay.val)} sub="Velocity" trend="neutral" icon={Activity} color={COLORS.info} />
          </div>
        </section>

        {/* ── SECTION 2: REVENUE INTELLIGENCE ── */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-4 rounded-3xl p-8 border card-token theme-transition overflow-hidden relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 relative z-10">
              <div>
                <SectionTitle title="Revenue Intelligence" sub="Performance trends with 7-day moving average overlay" />
              </div>
              <div className="flex bg-subtle p-1 rounded-xl border border-token shadow-inner">
                {(["Revenue", "Order Count", "Avg Value"] as const).map((t) => (
                  <button key={t} onClick={() => setActiveRevenueTab(t)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeRevenueTab === t ? "bg-card text-accent shadow-sm" : "text-muted hover:text-main"}`}>{t}</button>
                ))}
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-sub)', fontSize: 10, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-sub)', fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => activeRevenueTab === "Revenue" ? `₹${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}` : v} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', padding: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 800 }} />
                  <Area type="monotone" dataKey={activeRevenueTab === "Revenue" ? "revenue" : activeRevenueTab === "Order Count" ? "orders" : "avgValue"} stroke={COLORS.primary} strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                  <Line type="monotone" dataKey="ma" stroke={COLORS.primary} strokeWidth={2} strokeDasharray="8 4" dot={false} opacity={0.6} name="7D Moving Average" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10 pt-10 border-t border-token">
              <div className="group cursor-default">
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Peak Revenue Day</p>
                <div className="flex items-center gap-3">
                    <div className="text-xl font-black">{dailyData.length ? dailyData.sort((a,b) => b.revenue - a.revenue)[0].displayDate : "N/A"}</div>
                    <div className="text-sm font-bold text-accent">₹{dailyData.length ? dailyData.sort((a,b) => b.revenue - a.revenue)[0].revenue.toLocaleString() : 0}</div>
                </div>
              </div>
              <div className="group cursor-default">
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Daily Velocity</p>
                <div className="flex items-center gap-3">
                    <div className="text-xl font-black">{fmtCurrency(kpis.revPerDay.val)}</div>
                    <div className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">STABLE</div>
                </div>
              </div>
              <div className="group cursor-default">
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Rev. Growth Rate</p>
                <div className="flex items-center gap-3">
                    <div className="text-xl font-black">{kpis.revenue.trend.val}</div>
                    <div className={`text-[10px] font-black px-1.5 py-0.5 rounded ${kpis.revenue.trend.type === "up" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                        {kpis.revenue.trend.type === "up" ? "ACCELERATING" : "DECLINING"}
                    </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: ORDER PIPELINE ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-3xl p-8 border card-token theme-transition">
            <SectionTitle title="Order Fulfillment Funnel" sub="Visualizing the journey from order to delivery" />
            <div className="space-y-6 py-6">
              {funnelData.map((item, i) => {
                const pct = (item.value / (funnelData[0].value || 1)) * 100;
                const nextItem = funnelData[i + 1];
                const dropOff = nextItem ? Math.round((1 - nextItem.value / (item.value || 1)) * 100) : null;
                return (
                  <div key={item.name} className="relative group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-widest text-main">{item.name}</span>
                      <span className="text-sm font-black text-main">{item.value} <span className="text-muted font-bold text-[10px] ml-1">{Math.round(pct)}%</span></span>
                    </div>
                    <div className="h-12 w-full bg-subtle rounded-xl overflow-hidden flex border border-token shadow-inner">
                      <div className="h-full transition-all duration-1000 ease-out flex items-center px-4" style={{ width: `${pct}%`, backgroundColor: item.color, opacity: 0.85 }}>
                         {pct > 15 && <div className="h-1 w-full bg-white/20 rounded-full" />}
                      </div>
                    </div>
                    {dropOff !== null && dropOff > 0 && (
                      <div className="absolute -right-4 top-12 h-12 flex flex-col items-center justify-center translate-x-full">
                         <div className="flex items-center gap-2">
                            <div className="w-4 h-px bg-red-500/30" />
                            <div className="bg-red-500/10 text-red-500 text-[10px] font-black px-2 py-1 rounded-lg border border-red-500/20">
                               ↓ {dropOff}% LOSS
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl p-8 border card-token theme-transition">
            <SectionTitle title="Order Status Distribution" sub="Allocation of active orders by current stage" />
            <div className="flex flex-col sm:flex-row items-center gap-10 h-[320px]">
              <div className="relative w-64 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={8} dataKey="value" stroke="none">
                      {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS.primary} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-4xl font-black" style={{ color: "var(--text)" }}>{currentOrders.length}</p>
                  <p className="text-[10px] text-muted uppercase font-black tracking-[0.2em]">Orders</p>
                </div>
              </div>
              <div className="flex-1 w-full space-y-4">
                {statusData.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.name] || COLORS.primary }} />
                      <span className="text-xs font-black uppercase tracking-widest text-main">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-muted">{s.value}</span>
                      <span className="text-sm font-black text-main w-20 text-right">₹{s.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: PRODUCT & SKU ANALYTICS ── */}
        <section className="rounded-3xl p-8 border card-token theme-transition">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <SectionTitle title="Inventory Performance" sub="Tracking revenue contribution at the SKU level" />
            <div className="flex bg-subtle p-1 rounded-xl border border-token shadow-inner">
              {(["performance", "sku", "treemap"] as const).map((t) => (
                <button key={t} onClick={() => setProductTab(t)} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${productTab === t ? "bg-card text-accent shadow-md" : "text-muted hover:text-main"}`}>{t}</button>
              ))}
            </div>
          </div>

          {productTab === "performance" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-muted text-[10px] font-black uppercase tracking-[0.2em]">
                    <th className="px-4 pb-4">Rank</th>
                    <th className="px-4 pb-4">Product Name</th>
                    <th className="px-4 pb-4">SKU</th>
                    <th className="px-4 pb-4 text-center">Volume</th>
                    <th className="px-4 pb-4 text-right">Revenue</th>
                    <th className="px-4 pb-4 text-right">Share %</th>
                    <th className="px-4 pb-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {skuPerformance.slice(0, 8).map((sku, i) => {
                    const share = (sku.revenue / (kpis.revenue.val || 1)) * 100;
                    return (
                      <tr key={sku.sku} className="group bg-subtle/30 hover:bg-subtle transition-all">
                        <td className="px-4 py-4 rounded-l-2xl font-black text-muted italic">#{i+1}</td>
                        <td className="px-4 py-4 font-bold text-main">{sku.name}</td>
                        <td className="px-4 py-4 font-mono text-xs text-muted">{sku.sku}</td>
                        <td className="px-4 py-4 text-center font-black">{sku.qty}</td>
                        <td className="px-4 py-4 text-right font-black">{fmtCurrency(sku.revenue)}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-col items-end">
                             <span className="text-xs font-black text-accent">{share.toFixed(1)}%</span>
                             <div className="w-20 h-1 bg-token rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-accent" style={{ width: `${share}%` }} />
                             </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right rounded-r-2xl">
                           <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black">ACTIVE</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {productTab === "sku" && (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skuPerformance.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
                  <XAxis dataKey="sku" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip cursor={{ fill: 'var(--subtle)', opacity: 0.4 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="revenue" fill={COLORS.primary} radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {productTab === "treemap" && (
            <div className="h-[450px] rounded-3xl overflow-hidden border border-token bg-subtle/20">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap data={skuPerformance.slice(0, 20).map(s => ({ name: s.sku, size: s.revenue }))} dataKey="size" stroke="var(--card)" fill={COLORS.primary} animationDuration={1000}>
                    <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="bg-card p-3 rounded-xl border border-token shadow-2xl">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted">{payload[0].payload.name}</p>
                                    <p className="text-sm font-black mt-1">{fmtCurrency(payload[0].value)}</p>
                                </div>
                            );
                        }
                        return null;
                    }} />
                </Treemap>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* ── SECTION 6: TIME & PATTERN ANALYTICS ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {/* Day of Week */}
           <div className="rounded-3xl p-6 border card-token theme-transition">
              <SectionTitle title="Weekly Patterns" sub="Orders distributed by day of week" />
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekData}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip />
                    <Bar dataKey="orders" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-3 bg-subtle rounded-2xl flex items-center justify-between">
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted">Most Active Day</span>
                 <span className="text-sm font-black text-accent">{dayOfWeekData.sort((a,b) => b.orders - a.orders)[0].day}</span>
              </div>
           </div>

           {/* Heatmap Calendar */}
           <div className="rounded-3xl p-6 border card-token theme-transition">
              <SectionTitle title="Revenue Heatmap" sub="Intensity of sales over the last 5 weeks" />
              <div className="grid grid-cols-7 gap-2 mt-4">
                 {["S", "M", "T", "W", "T", "F", "S"].map(d => <div key={d} className="text-center text-[10px] font-black text-muted mb-2">{d}</div>)}
                 {heatmapData.map((d, i) => {
                    const intensity = d.revenue > 1000 ? 1 : d.revenue > 500 ? 0.7 : d.revenue > 0 ? 0.4 : 0.1;
                    return (
                        <div key={i} className="aspect-square rounded-md border border-token relative group cursor-pointer" style={{ backgroundColor: d.revenue > 0 ? `rgba(99, 102, 241, ${intensity})` : 'var(--bg-subtle)' }}>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-md z-10">
                                <span className="text-[8px] font-black text-white">₹{d.revenue}</span>
                            </div>
                        </div>
                    );
                 })}
              </div>
              <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                      <span className="text-[8px] text-muted">Less</span>
                      <div className="w-2 h-2 rounded bg-indigo-500/10" />
                      <div className="w-2 h-2 rounded bg-indigo-500/40" />
                      <div className="w-2 h-2 rounded bg-indigo-500/70" />
                      <div className="w-2 h-2 rounded bg-indigo-500" />
                      <span className="text-[8px] text-muted">More</span>
                  </div>
                  <span className="text-[10px] font-black text-main uppercase">Daily Intensity</span>
              </div>
           </div>

           {/* Cumulative Line */}
           <div className="rounded-3xl p-6 border card-token theme-transition">
              <SectionTitle title="Growth Trajectory" sub="Cumulative revenue progression" />
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                        <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="displayDate" hide />
                    <Tooltip />
                    <Area type="monotone" dataKey="cumulative" stroke={COLORS.success} strokeWidth={3} fill="url(#colorCum)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center justify-between">
                  <div>
                      <p className="text-[10px] font-black text-muted uppercase">Period Total</p>
                      <p className="text-xl font-black">{fmtCurrency(kpis.revenue.val)}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black text-muted uppercase">Proj. End of Month</p>
                      <p className="text-sm font-black text-success">₹{(kpis.revenue.val * 1.2).toLocaleString()}</p>
                  </div>
              </div>
           </div>
        </section>

        {/* ── SECTION 7: FULFILLMENT PERFORMANCE ── */}
        <section className="rounded-3xl border card-token theme-transition overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x border-token">
                <div className="p-8 lg:col-span-2">
                    <SectionTitle title="Status Timeline" sub="Real-time visibility into every order stage" />
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                        {orderAudit.slice(0, 10).map((o) => {
                            const curStep = ["Processing", "Packed", "Dispatched", "Delivered"].indexOf(o.status);
                            return (
                                <div key={o.id} className="group p-4 rounded-2xl bg-subtle/20 border border-token hover:border-accent/30 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black font-mono text-main">{o.orderNumber}</span>
                                            <span className="text-[10px] font-bold text-muted">{o.customerName}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                            o.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                            o.status === 'Cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                                        }`}>
                                            {o.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[0, 1, 2, 3].map(step => (
                                            <div key={step} className="flex-1 h-1.5 rounded-full overflow-hidden bg-token">
                                                <div className="h-full transition-all duration-700" style={{ 
                                                    width: step <= curStep ? '100%' : '0%', 
                                                    backgroundColor: step <= curStep ? STATUS_COLORS[o.status] || COLORS.primary : 'transparent' 
                                                }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div>
                        <SectionTitle title="Dispatch Gauge" sub="Current fulfillment rate" />
                        <div className="flex flex-col items-center justify-center h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ value: kpis.dispatch.val }, { value: 100 - kpis.dispatch.val }]} startAngle={180} endAngle={0} innerRadius={70} outerRadius={90} dataKey="value" stroke="none">
                                        <Cell fill={kpis.dispatch.val > 75 ? COLORS.success : kpis.dispatch.val > 40 ? COLORS.warning : COLORS.danger} />
                                        <Cell fill="var(--divider)" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-[-70px] text-center">
                                <p className="text-4xl font-black">{Math.round(kpis.dispatch.val)}%</p>
                                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Target: 80%</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-token">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-subtle/30 border border-token">
                            <div>
                                <p className="text-[10px] font-black text-muted uppercase">Avg. Cycle Time</p>
                                <p className="text-lg font-black">2.4 Days</p>
                            </div>
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500"><Activity size={20} /></div>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-subtle/30 border border-token">
                            <div>
                                <p className="text-[10px] font-black text-muted uppercase">Stuck Orders</p>
                                <p className="text-lg font-black">{kpis.pending.val}</p>
                            </div>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500"><AlertTriangle size={20} /></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* ── SECTION 8: AI INSIGHTS FEED ── */}
        <section>
             <SectionTitle title="Smart AI Insights" sub="Heuristic analysis of your current sales and operational data" />
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {insights.map((insight, i) => (
                    <div key={i} className="p-6 rounded-3xl border card-token theme-transition flex flex-col gap-4 group hover:scale-[1.02] shadow-sm" style={{ borderTop: `4px solid ${insight.color}` }}>
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 rounded-2xl" style={{ backgroundColor: `${insight.color}15`, color: insight.color }}>
                                <insight.icon size={22} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ borderColor: `${insight.color}30`, color: insight.color }}>
                                {insight.type}
                            </span>
                        </div>
                        <div>
                            <h4 className="font-black text-main text-sm mb-2">{insight.label}</h4>
                            <p className="text-xs text-muted leading-relaxed mb-4">{insight.text}</p>
                            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent hover:gap-3 transition-all">
                                View Analysis <ArrowRight size={10} />
                            </button>
                        </div>
                    </div>
                ))}
             </div>
        </section>

        {/* ── SECTION 9: FULL ORDER AUDIT TABLE ── */}
        <section className="rounded-3xl border card-token theme-transition overflow-hidden">
            <div className="p-8 border-b border-token flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black" style={{ color: "var(--text)" }}>Complete Order Ledger</h3>
                    <p className="text-sm text-muted">Detailed audit trail of all orders in current period</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="relative">
                       <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                       <input placeholder="Search audit trail..." className="pl-9 pr-4 py-2 text-xs rounded-xl bg-subtle/50 border border-token focus:outline-none focus:ring-2 focus:ring-accent" />
                   </div>
                   <button className="p-2 rounded-xl btn-ghost"><Filter size={16} /></button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-subtle/30 text-muted text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-8 py-5">Order ID</th>
                            <th className="px-6 py-5">Date</th>
                            <th className="px-6 py-5">Customer</th>
                            <th className="px-6 py-5">Product</th>
                            <th className="px-6 py-5 text-right">Amount</th>
                            <th className="px-6 py-5 text-center">Status</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-token">
                        {orderAudit.map((o) => (
                            <tr key={o.id} className="hover:bg-subtle/50 transition-colors">
                                <td className="px-8 py-5 font-black font-mono text-xs">{o.orderNumber}</td>
                                <td className="px-6 py-5 text-muted text-xs font-bold">{new Date(o.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</td>
                                <td className="px-6 py-5 font-bold">{o.customerName}</td>
                                <td className="px-6 py-5 text-muted truncate max-w-[200px]">{o.productName}</td>
                                <td className="px-6 py-5 text-right font-black">{fmtCurrency(Number(o.amount || 0))}</td>
                                <td className="px-6 py-5 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black border" style={{ 
                                        backgroundColor: `${STATUS_COLORS[o.status] || COLORS.primary}10`,
                                        color: STATUS_COLORS[o.status] || COLORS.primary,
                                        borderColor: `${STATUS_COLORS[o.status] || COLORS.primary}30`
                                    }}>
                                        {o.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button className="p-1.5 rounded-lg btn-ghost hover:text-accent"><MoreHorizontal size={14} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-6 bg-subtle/20 border-t border-token flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                <div className="flex gap-6">
                    <span>Total: {currentOrders.length} Orders</span>
                    <span>Revenue: {fmtCurrency(kpis.revenue.val)}</span>
                    <span>Avg Ticket: {fmtCurrency(kpis.avgValue.val)}</span>
                </div>
                <div>Page 1 of 1</div>
            </div>
        </section>

      </main>
    </div>
  );
}
