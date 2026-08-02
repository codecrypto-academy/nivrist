"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAdminData, type AdminData } from "@/hooks/useAdminData";

const AdminDataContext = createContext<AdminData | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const data = useAdminData();
  return <AdminDataContext.Provider value={data}>{children}</AdminDataContext.Provider>;
}

export function useAdmin(): AdminData {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdmin must be used within <AdminDataProvider>");
  return ctx;
}
