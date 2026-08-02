import type { Metadata } from "next";
import "./globals.css";
import { MetaMaskProvider } from "@/contexts/MetaMaskContext";

export const metadata: Metadata = {
  title: "ETH Document Registry",
  description: "Store and verify document authenticity on Ethereum",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MetaMaskProvider>{children}</MetaMaskProvider>
      </body>
    </html>
  );
}
