import type { Metadata } from "next";
import { Syne, Chivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { EthereumProvider } from "@/lib/ethereum";
import { EscrowStoreProvider } from "@/lib/store";

const display = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });
const body = Chivo({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Escrow DApp",
  description: "Intercambios seguros de tokens ERC-20 con escrow on-chain",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-sans">
        <EthereumProvider>
          <EscrowStoreProvider>{children}</EscrowStoreProvider>
        </EthereumProvider>
      </body>
    </html>
  );
}
