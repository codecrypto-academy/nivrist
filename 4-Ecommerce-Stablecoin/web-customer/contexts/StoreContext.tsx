"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useWeb3 } from "./Web3Context";
import {
  ecommerce,
  readProvider,
  toCompany,
  toInvoice,
  toProduct,
  type Company,
  type Invoice,
  type Product,
} from "@/lib/contracts";
import { ECOMMERCE_ADDRESS } from "@/lib/config";

export interface CartLine {
  productId: number;
  quantity: number;
}

interface StoreValue {
  products: Product[];
  companies: Company[];
  cart: CartLine[];
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  cartCount: number;
  refresh: () => Promise<void>;
  refreshCart: () => Promise<void>;
  addToCart: (productId: number, qty: number) => Promise<void>;
  updateQty: (productId: number, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  productById: (id: number) => Product | undefined;
  companyById: (id: number) => Company | undefined;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { account, getSigner } = useWeb3();
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCatalog = useCallback(async () => {
    if (!ECOMMERCE_ADDRESS) {
      setError("NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS no está configurada");
      return;
    }
    setError(null);
    const shop = ecommerce(readProvider());
    const [prods, comps] = await Promise.all([shop.getAllProducts(), shop.getAllCompanies()]);
    setProducts((prods as any[]).map(toProduct));
    setCompanies((comps as any[]).map(toCompany));
  }, []);

  const refreshCart = useCallback(async () => {
    if (!account) {
      setCart([]);
      return;
    }
    const shop = ecommerce(readProvider());
    const items = await shop.getCart(account);
    setCart(
      (items as { productId: bigint; quantity: bigint }[]).map((i) => ({
        productId: Number(i.productId),
        quantity: Number(i.quantity),
      }))
    );
  }, [account]);

  const refreshInvoices = useCallback(async () => {
    if (!account) {
      setInvoices([]);
      return;
    }
    const shop = ecommerce(readProvider());
    const ids: bigint[] = await shop.getCustomerInvoices(account);
    const list: Invoice[] = [];
    for (const id of ids) list.push(toInvoice(await shop.getInvoice(id)));
    setInvoices(list);
  }, [account]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([refreshCatalog(), refreshCart(), refreshInvoices()]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [refreshCatalog, refreshCart, refreshInvoices]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addToCart = useCallback(
    async (productId: number, qty: number) => {
      const shop = ecommerce(await getSigner());
      const tx = await shop.addToCart(productId, qty);
      await tx.wait();
      await refreshCart();
    },
    [getSigner, refreshCart]
  );

  const updateQty = useCallback(
    async (productId: number, qty: number) => {
      const shop = ecommerce(await getSigner());
      const tx = await shop.updateCartQuantity(productId, qty);
      await tx.wait();
      await refreshCart();
    },
    [getSigner, refreshCart]
  );

  const clearCart = useCallback(async () => {
    const shop = ecommerce(await getSigner());
    const tx = await shop.clearCart();
    await tx.wait();
    await refreshCart();
  }, [getSigner, refreshCart]);

  const value = useMemo<StoreValue>(
    () => ({
      products,
      companies,
      cart,
      invoices,
      loading,
      error,
      cartCount: cart.reduce((n, l) => n + l.quantity, 0),
      refresh,
      refreshCart,
      addToCart,
      updateQty,
      clearCart,
      productById: (id) => products.find((p) => p.productId === id),
      companyById: (id) => companies.find((c) => c.companyId === id),
    }),
    [products, companies, cart, invoices, loading, error, refresh, refreshCart, addToCart, updateQty, clearCart]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
