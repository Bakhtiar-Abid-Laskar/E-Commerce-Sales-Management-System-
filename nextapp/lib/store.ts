"use client";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderNote {
  text: string;
  timestamp: string;
  by: string;
}

export interface TimelineEntry {
  action: string;
  timestamp: string;
  by: string;
}

export interface Order {
  id: string;
  productName: string;
  sku: string;
  invoiceNumber: string;
  orderNumber: string;
  amount: number | string;
  customerName: string;
  customerPhone: string;
  courierPartner: string;
  courierAWB: string;
  deliveryAddress: string;
  pincode: string;
  weight: string;
  date: string;
  expectedDeliveryDate: string;
  orderType: "Standard" | "Return" | "Refund";
  status: "Processing" | "Packed" | "Dispatched" | "Delivered" | "Cancelled";
  priority: "Normal" | "Urgent" | "Starred";
  starred: boolean;
  notes: OrderNote[];
  timeline: TimelineEntry[];
}

export interface FilterPreset {
  name: string;
  filters: Record<string, unknown>;
}

// ─── Sample seed data ─────────────────────────────────────────────────────────

const SAMPLE_ORDERS: Order[] = [
  {
    id: "ord_001",
    productName: "Sony WH-1000XM5 Headphones",
    sku: "SON-WH-XM5-BLK",
    invoiceNumber: "INV-2024-0341",
    orderNumber: "ORD-2024-0341",
    amount: 29990,
    customerName: "Rahul Sharma",
    customerPhone: "9876543210",
    courierPartner: "Delhivery",
    courierAWB: "DEL1234567890",
    deliveryAddress: "B-204, Ansal Towers, Sector 62, Noida",
    pincode: "201301",
    weight: "320g",
    date: "2024-01-10",
    expectedDeliveryDate: "2024-01-15",
    orderType: "Standard",
    status: "Delivered",
    priority: "Normal",
    starred: false,
    notes: [{ text: "Customer requested gift wrapping", timestamp: "2024-01-10T11:00:00", by: "User" }],
    timeline: [
      { action: "Order created", timestamp: "2024-01-10T10:30:00", by: "User" },
      { action: "Status → Dispatched", timestamp: "2024-01-12T14:20:00", by: "User" },
      { action: "Status → Delivered", timestamp: "2024-01-15T16:45:00", by: "User" },
    ],
  },
  {
    id: "ord_002",
    productName: "Apple AirPods Pro (2nd Gen)",
    sku: "APL-AIRPODS-PRO2",
    invoiceNumber: "INV-2024-0342",
    orderNumber: "ORD-2024-0342",
    amount: 24900,
    customerName: "Priya Patel",
    customerPhone: "9123456789",
    courierPartner: "BlueDart",
    courierAWB: "BLU9876543210",
    deliveryAddress: "12, MG Road, Koramangala, Bengaluru",
    pincode: "560034",
    weight: "180g",
    date: "2024-01-14",
    expectedDeliveryDate: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    orderType: "Standard",
    status: "Dispatched",
    priority: "Urgent",
    starred: true,
    notes: [],
    timeline: [
      { action: "Order created", timestamp: "2024-01-14T09:15:00", by: "User" },
      { action: "Status → Packed", timestamp: "2024-01-14T15:30:00", by: "User" },
      { action: "Status → Dispatched", timestamp: "2024-01-15T08:00:00", by: "User" },
    ],
  },
  {
    id: "ord_003",
    productName: 'Samsung 4K Monitor 27"',
    sku: "SAM-MON-27-4K",
    invoiceNumber: "INV-2024-0343",
    orderNumber: "ORD-2024-0343",
    amount: 45000,
    customerName: "Amit Verma",
    customerPhone: "9988776655",
    courierPartner: "Ekart",
    courierAWB: "EKT5432167890",
    deliveryAddress: "Flat 5B, Tower C, Oberoi Garden, Mumbai",
    pincode: "400063",
    weight: "7.2kg",
    date: "2024-01-13",
    expectedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    orderType: "Standard",
    status: "Processing",
    priority: "Normal",
    starred: false,
    notes: [{ text: "Large package - needs ground floor delivery", timestamp: "2024-01-13T14:00:00", by: "User" }],
    timeline: [{ action: "Order created", timestamp: "2024-01-13T13:00:00", by: "User" }],
  },
  {
    id: "ord_004",
    productName: "Nike Air Max 270",
    sku: "NIK-AM270-BLK-10",
    invoiceNumber: "INV-2024-0344",
    orderNumber: "ORD-2024-0344",
    amount: 12995,
    customerName: "Sneha Joshi",
    customerPhone: "9871234560",
    courierPartner: "DTDC",
    courierAWB: "DTC1122334455",
    deliveryAddress: "23, Park Street, New Delhi",
    pincode: "110001",
    weight: "850g",
    date: "2024-01-08",
    expectedDeliveryDate: "2024-01-12",
    orderType: "Return",
    status: "Processing",
    priority: "Normal",
    starred: false,
    notes: [{ text: "Wrong size delivered, customer wants exchange", timestamp: "2024-01-16T10:00:00", by: "User" }],
    timeline: [{ action: "Return order created", timestamp: "2024-01-16T10:00:00", by: "User" }],
  },
];

// ─── ID generator ─────────────────────────────────────────────────────────────

const genId = () => `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Store interface ──────────────────────────────────────────────────────────

interface SalesStore {
  // State
  orders: Order[];
  darkMode: boolean;
  presets: FilterPreset[];
  hydrated: boolean;

  // Order actions
  setOrders: (orders: Order[]) => void;
  addOrder: (form: Partial<Order>, isEdit?: boolean, editId?: string) => void;
  deleteOrder: (id: string) => void;
  updateStatus: (ids: string[], newStatus: Order["status"]) => void;
  addNote: (id: string, text: string) => void;
  toggleStar: (id: string) => void;

  // UI actions
  toggleDarkMode: () => void;

  // Preset actions
  savePreset: (name: string, filters: Record<string, unknown>) => void;
  deletePreset: (name: string) => void;

  // Hydration
  setHydrated: (v: boolean) => void;
}

// ─── localforage helper (dynamic import — safe in SSR) ────────────────────────

const lf = {
  async getItem<T>(key: string): Promise<T | null> {
    if (typeof window === "undefined") return null;
    const mod = await import("localforage");
    return mod.default.getItem<T>(key);
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    if (typeof window === "undefined") return;
    const mod = await import("localforage");
    await mod.default.setItem(key, value);
  },
};

// ─── Zustand store ────────────────────────────────────────────────────────────

export const useSalesStore = create<SalesStore>()(
  subscribeWithSelector((set, get) => ({
    orders: SAMPLE_ORDERS,
    darkMode: false,
    presets: [],
    hydrated: false,

    setHydrated: (v) => set({ hydrated: v }),

    setOrders: (orders) => {
      set({ orders });
      lf.setItem("salestracker_orders", orders);
    },

    addOrder: (form, isEdit = false, editId) => {
      const ts = new Date().toISOString();
      if (isEdit && editId) {
        const orders = get().orders.map((o) =>
          o.id === editId
            ? { ...o, ...form, timeline: [...(o.timeline || []), { action: "Order edited", timestamp: ts, by: "User" }] }
            : o
        );
        set({ orders });
        lf.setItem("salestracker_orders", orders);
      } else {
        const newOrder: Order = {
          id: genId(),
          productName: "",
          sku: "",
          invoiceNumber: "",
          orderNumber: "",
          amount: 0,
          customerName: "",
          customerPhone: "",
          courierPartner: "Delhivery",
          courierAWB: "",
          deliveryAddress: "",
          pincode: "",
          weight: "",
          date: new Date().toISOString().split("T")[0],
          expectedDeliveryDate: "",
          orderType: "Standard",
          status: "Processing",
          priority: "Normal",
          starred: false,
          notes: [],
          timeline: [],
          ...form,
        };
        // Override starred and timeline after spread
        newOrder.starred = form.priority === "Starred" || !!form.starred;
        newOrder.timeline = [{ action: "Order created", timestamp: ts, by: "User" }];
        const orders = [newOrder, ...get().orders];
        set({ orders });
        lf.setItem("salestracker_orders", orders);
      }
    },

    deleteOrder: (id) => {
      const orders = get().orders.filter((o) => o.id !== id);
      set({ orders });
      lf.setItem("salestracker_orders", orders);
    },

    updateStatus: (ids, newStatus) => {
      const ts = new Date().toISOString();
      const orders = get().orders.map((o) =>
        ids.includes(o.id)
          ? { ...o, status: newStatus, timeline: [...(o.timeline || []), { action: `Status → ${newStatus}`, timestamp: ts, by: "User" }] }
          : o
      );
      set({ orders });
      lf.setItem("salestracker_orders", orders);
    },

    addNote: (id, text) => {
      const entry: OrderNote = { text, timestamp: new Date().toISOString(), by: "User" };
      const orders = get().orders.map((o) =>
        o.id === id
          ? {
              ...o,
              notes: [...(o.notes || []), entry],
              timeline: [...(o.timeline || []), { action: `Note added: "${text.slice(0, 30)}…"`, timestamp: entry.timestamp, by: "User" }],
            }
          : o
      );
      set({ orders });
      lf.setItem("salestracker_orders", orders);
    },

    toggleStar: (id) => {
      const orders = get().orders.map((o) =>
        o.id === id ? { ...o, starred: !o.starred } : o
      );
      set({ orders });
      lf.setItem("salestracker_orders", orders);
    },

    toggleDarkMode: () => {
      const darkMode = !get().darkMode;
      set({ darkMode });
      if (typeof window !== "undefined") {
        localStorage.setItem("salestracker_darkmode", String(darkMode));
        document.documentElement.classList.toggle("dark", darkMode);
      }
    },

    savePreset: (name, filters) => {
      if (!name.trim()) return;
      const presets = [
        ...get().presets.filter((p) => p.name !== name),
        { name: name.trim(), filters },
      ];
      set({ presets });
      lf.setItem("salestracker_presets", presets);
    },

    deletePreset: (name) => {
      const presets = get().presets.filter((p) => p.name !== name);
      set({ presets });
      lf.setItem("salestracker_presets", presets);
    },
  }))
);

// ─── Hydration helper — call once in a client component ──────────────────────

export async function hydrateStore() {
  const store = useSalesStore.getState();
  if (store.hydrated) return;

  const [orders, presets] = await Promise.all([
    lf.getItem<Order[]>("salestracker_orders"),
    lf.getItem<FilterPreset[]>("salestracker_presets"),
  ]);

  // Dark mode still uses localStorage (UI preference, not data)
  const dm = typeof window !== "undefined"
    ? localStorage.getItem("salestracker_darkmode") === "true"
    : false;

  useSalesStore.setState({
    orders: orders ?? SAMPLE_ORDERS,
    presets: presets ?? [],
    darkMode: dm,
    hydrated: true,
  });

  if (dm) document.documentElement.classList.add("dark");
}
