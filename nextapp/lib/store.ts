"use client";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";

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

// ─── Zustand store ────────────────────────────────────────────────────────────

export const useSalesStore = create<SalesStore>()(
  subscribeWithSelector((set, get) => ({
    orders: [],
    darkMode: false,
    presets: [],
    hydrated: false,

    setHydrated: (v) => set({ hydrated: v }),

    setOrders: (orders) => {
      set({ orders });
    },

    addOrder: async (form, isEdit = false, editId) => {
      const ts = new Date().toISOString();
      const supabase = createClient();
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) return; // Must be logged in

      if (isEdit && editId) {
        const currentOrders = get().orders;
        const target = currentOrders.find(o => o.id === editId);
        if (!target) return;

        const updatedOrder = {
          ...target,
          ...form,
          timeline: [...(target.timeline || []), { action: "Order edited", timestamp: ts, by: "User" }]
        };

        const orders = currentOrders.map((o) => o.id === editId ? updatedOrder : o);
        set({ orders }); // Optimistic update

        await supabase.from('orders').update({
          ...updatedOrder,
          user_id: user.id
        }).eq('id', editId);
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
        newOrder.starred = form.priority === "Starred" || !!form.starred;
        newOrder.timeline = [{ action: "Order created", timestamp: ts, by: "User" }];
        
        const orders = [newOrder, ...get().orders];
        set({ orders }); // Optimistic update

        await supabase.from('orders').insert({
          ...newOrder,
          user_id: user.id
        });
      }
    },

    deleteOrder: async (id) => {
      const orders = get().orders.filter((o) => o.id !== id);
      set({ orders }); // Optimistic update

      const supabase = createClient();
      await supabase.from('orders').delete().eq('id', id);
    },

    updateStatus: async (ids, newStatus) => {
      const ts = new Date().toISOString();
      const supabase = createClient();
      const currentOrders = get().orders;

      const orders = currentOrders.map((o) =>
        ids.includes(o.id)
          ? { ...o, status: newStatus, timeline: [...(o.timeline || []), { action: `Status → ${newStatus}`, timestamp: ts, by: "User" }] }
          : o
      );
      set({ orders }); // Optimistic update

      // Update in Supabase
      const updatedItems = orders.filter(o => ids.includes(o.id));
      for (const item of updatedItems) {
         await supabase.from('orders').update({
           status: item.status,
           timeline: item.timeline
         }).eq('id', item.id);
      }
    },

    addNote: async (id, text) => {
      const entry: OrderNote = { text, timestamp: new Date().toISOString(), by: "User" };
      const supabase = createClient();
      
      const orders = get().orders.map((o) =>
        o.id === id
          ? {
              ...o,
              notes: [...(o.notes || []), entry],
              timeline: [...(o.timeline || []), { action: `Note added: "${text.slice(0, 30)}…"`, timestamp: entry.timestamp, by: "User" }],
            }
          : o
      );
      set({ orders }); // Optimistic update

      const target = orders.find(o => o.id === id);
      if (target) {
        await supabase.from('orders').update({
          notes: target.notes,
          timeline: target.timeline
        }).eq('id', id);
      }
    },

    toggleStar: async (id) => {
      const supabase = createClient();
      const orders = get().orders.map((o) =>
        o.id === id ? { ...o, starred: !o.starred } : o
      );
      set({ orders }); // Optimistic update

      const target = orders.find(o => o.id === id);
      if (target) {
        await supabase.from('orders').update({
          starred: target.starred
        }).eq('id', id);
      }
    },

    toggleDarkMode: () => {
      const darkMode = !get().darkMode;
      set({ darkMode });
      if (typeof window !== "undefined") {
        localStorage.setItem("salestracker_darkmode", String(darkMode));
        document.documentElement.classList.toggle("dark", darkMode);
      }
    },

    savePreset: async (name, filters) => {
      if (!name.trim()) return;
      const supabase = createClient();
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) return;

      const trimmedName = name.trim();
      const presets = [
        ...get().presets.filter((p) => p.name !== trimmedName),
        { name: trimmedName, filters },
      ];
      set({ presets }); // Optimistic update

      await supabase.from('presets').upsert({
        name: trimmedName,
        filters,
        user_id: user.id
      });
    },

    deletePreset: async (name) => {
      const presets = get().presets.filter((p) => p.name !== name);
      set({ presets }); // Optimistic update

      const supabase = createClient();
      const userRes = await supabase.auth.getUser();
      if (!userRes.data.user) return;

      await supabase.from('presets')
        .delete()
        .eq('name', name)
        .eq('user_id', userRes.data.user.id);
    },
  }))
);

// ─── Hydration helper — call once in a client component ──────────────────────

export async function hydrateStore() {
  const store = useSalesStore.getState();
  if (store.hydrated) return;

  const supabase = createClient();
  const userRes = await supabase.auth.getUser();
  const user = userRes.data.user;

  let orders: Order[] = [];
  let presets: FilterPreset[] = [];

  if (user) {
    // Fetch orders and presets from Supabase
    const [ordersRes, presetsRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('presets').select('*').order('created_at', { ascending: false })
    ]);

    if (ordersRes.data) {
      // Ensure notes and timeline are parsed properly if Supabase returns them as arrays/objects
      orders = ordersRes.data as Order[];
    }
    if (presetsRes.data) {
      presets = presetsRes.data as FilterPreset[];
    }
  }

  // Dark mode still uses localStorage (UI preference, not data)
  const dm = typeof window !== "undefined"
    ? localStorage.getItem("salestracker_darkmode") === "true"
    : false;

  useSalesStore.setState({
    orders,
    presets,
    darkMode: dm,
    hydrated: true,
  });

  if (dm && typeof document !== "undefined") {
    document.documentElement.classList.add("dark");
  }
}
