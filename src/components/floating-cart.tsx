"use client";

import * as React from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  currency?: string | null;
  imageUrl?: string | null;
};

type CartLine = CartProduct & { quantity: number };
type CartState = {
  lines: CartLine[];
  add: (product: CartProduct) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  count: number;
};

const CartContext = React.createContext<CartState | null>(null);
const STORAGE = "farmasi:demo-cart:v1";

export function useCart() {
  const value = React.useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

const price = (amount: number | null, currency = "EUR") =>
  amount == null ? "" : new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<CartLine[]>([]);
  const [ready, setReady] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    try { setLines(JSON.parse(localStorage.getItem(STORAGE) ?? "[]")); } catch { /* empty cart */ }
    setReady(true);
  }, []);
  React.useEffect(() => { if (ready) localStorage.setItem(STORAGE, JSON.stringify(lines)); }, [lines, ready]);

  const add = React.useCallback((product: CartProduct) => {
    setLines((current) => {
      const existing = current.find((line) => line.id === product.id);
      return existing
        ? current.map((line) => line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...current, { ...product, quantity: 1 }];
    });
    setOpen(true);
  }, []);
  const setQuantity = React.useCallback((id: string, quantity: number) => {
    setLines((current) => quantity < 1 ? current.filter((line) => line.id !== id) : current.map((line) => line.id === id ? { ...line, quantity } : line));
  }, []);
  const remove = React.useCallback((id: string) => setLines((current) => current.filter((line) => line.id !== id)), []);
  const count = lines.reduce((total, line) => total + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0);

  return <CartContext.Provider value={{ lines, add, remove, setQuantity, count }}>
    {children}
    <div className="fixed bottom-5 right-4 z-[80] sm:bottom-6 sm:right-6">
      {open && <div className="absolute bottom-16 right-0 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-[#f5dfce]/35 bg-[#171111]/95 text-[#fff7f2] shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div><p className="font-serif text-lg">Mon panier</p><p className="text-xs text-white/55">Sélection Farmasi</p></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Fermer le panier"><X className="size-4" /></button>
        </div>
        {lines.length === 0 ? <p className="px-4 py-8 text-center text-sm text-white/60">Votre sélection apparaîtra ici après le scan ou l&apos;essai virtuel.</p> : <>
          <div className="max-h-[45vh] divide-y divide-white/10 overflow-y-auto px-4">
            {lines.map((line) => <div key={line.id} className="flex gap-3 py-3">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">{line.imageUrl && <img src={line.imageUrl} alt="" className="size-full object-contain" />}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{line.name}</p><p className="mt-0.5 text-xs text-white/60">{price(line.price, line.currency ?? "EUR")}</p><div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => setQuantity(line.id, line.quantity - 1)} className="rounded-full border border-white/20 p-1" aria-label={`Retirer ${line.name}`}><Minus className="size-3" /></button><span className="min-w-4 text-center text-xs">{line.quantity}</span><button type="button" onClick={() => setQuantity(line.id, line.quantity + 1)} className="rounded-full border border-white/20 p-1" aria-label={`Ajouter ${line.name}`}><Plus className="size-3" /></button><button type="button" onClick={() => remove(line.id)} className="ml-auto rounded-full p-1.5 text-white/55 hover:bg-white/10 hover:text-white" aria-label={`Supprimer ${line.name}`}><Trash2 className="size-3.5" /></button></div></div>
            </div>)}
          </div>
          <div className="border-t border-white/10 bg-white/[.04] p-4"><div className="mb-3 flex items-center justify-between text-sm"><span className="text-white/65">Total estimé</span><strong>{price(total)}</strong></div><button type="button" onClick={() => setOpen(false)} className="w-full rounded-full bg-[#f4c5d7] px-4 py-3 text-sm font-bold text-[#381520]">Continuer mes achats</button></div>
        </>}
      </div>}
      <button type="button" onClick={() => setOpen((value) => !value)} className="farmasi-float-mark relative flex size-14 items-center justify-center rounded-full transition hover:scale-105" aria-label="Ouvrir ma sélection Farmasi" aria-expanded={open}><img src="/farmasi-logo.png" alt="" className="w-8 object-contain brightness-0 invert" />{count > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#4d4d53] text-[11px] font-bold text-white ring-2 ring-white">{count}</span>}</button>
    </div>
  </CartContext.Provider>;
}
