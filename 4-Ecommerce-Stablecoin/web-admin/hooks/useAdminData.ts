"use client";

import { useCallback, useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
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

export interface AdminData {
  myCompany: Company | null;
  products: Product[];
  invoices: Invoice[];
  customers: string[];
  euroBalance: bigint;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Loads the connected merchant's company, its products, invoices and customers. */
export function useAdminData(): AdminData {
  const { account } = useWeb3();
  const [myCompany, setMyCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [euroBalance, setEuroBalance] = useState(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!ECOMMERCE_ADDRESS) {
      setError("NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS no está configurada");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const shop = ecommerce(readProvider());

      if (!account) {
        setMyCompany(null);
        setProducts([]);
        setInvoices([]);
        setCustomers([]);
        return;
      }

      const companyId = Number(await shop.companyOf(account));
      if (companyId === 0) {
        setMyCompany(null);
        setProducts([]);
        setInvoices([]);
        setCustomers([]);
        return;
      }

      const company = toCompany(await shop.getCompany(companyId));
      setMyCompany(company);

      const allProducts = (await shop.getAllProducts()).map(toProduct) as Product[];
      setProducts(allProducts.filter((p) => p.companyId === companyId));

      const invoiceIds: bigint[] = await shop.getCompanyInvoices(companyId);
      const invs: Invoice[] = [];
      for (const id of invoiceIds) invs.push(toInvoice(await shop.getInvoice(id)));
      setInvoices(invs);

      // Customers who bought from this company.
      setCustomers([...new Set(invs.map((i) => i.customerAddress))]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [account]);

  // Merchant's EURT balance (funds received).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    async function loadBalance() {
      if (!account) {
        setEuroBalance(0n);
        return;
      }
      try {
        const { euroToken } = await import("@/lib/contracts");
        const bal: bigint = await euroToken(readProvider()).balanceOf(account);
        setEuroBalance(bal);
      } catch {
        setEuroBalance(0n);
      }
    }
    void loadBalance();
  }, [account, invoices]);

  return { myCompany, products, invoices, customers, euroBalance, loading, error, refresh };
}
