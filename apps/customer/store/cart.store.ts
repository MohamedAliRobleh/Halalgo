import { create } from 'zustand';
import type { SelectedModifier } from '@halalgo/types';

export interface CartItem {
  menuItemId:        string;
  name:              string;
  quantity:          number;
  unitPrice:         number;
  selectedModifiers: SelectedModifier[];
  imageUrl:          string | null;
  specialRequests:   string | null;
}

interface CartStore {
  storeId:    string | null;
  storeName:  string | null;
  items:      CartItem[];
  addItem:    (item: CartItem, storeId: string, storeName: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQty:  (menuItemId: string, quantity: number) => void;
  clear:      () => void;
  subtotal:   () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  storeId:    null,
  storeName:  null,
  items:      [],

  addItem: (item, storeId, storeName) => {
    const current = get();
    if (current.storeId && current.storeId !== storeId) {
      set({ items: [item], storeId, storeName });
      return;
    }
    const existing = current.items.find((i) => i.menuItemId === item.menuItemId);
    if (existing) {
      set({
        items: current.items.map((i) =>
          i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + item.quantity } : i,
        ),
        storeId,
        storeName,
      });
    } else {
      set({ items: [...current.items, item], storeId, storeName });
    }
  },

  removeItem: (menuItemId) =>
    set((s) => ({ items: s.items.filter((i) => i.menuItemId !== menuItemId) })),

  updateQty: (menuItemId, quantity) =>
    set((s) => ({
      items: quantity <= 0
        ? s.items.filter((i) => i.menuItemId !== menuItemId)
        : s.items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i)),
    })),

  clear: () => set({ items: [], storeId: null, storeName: null }),

  subtotal: () =>
    get().items.reduce((sum, item) => {
      const modTotal = item.selectedModifiers.reduce((m, mod) => m + mod.priceDelta, 0);
      return sum + (item.unitPrice + modTotal) * item.quantity;
    }, 0),

  totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
