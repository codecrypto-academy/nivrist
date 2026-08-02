import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/contexts/Web3Context";

export const metadata: Metadata = {
  title: "DAO — Votación Gasless",
  description: "DAO con votación sin gas vía meta-transacciones EIP-2771",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
