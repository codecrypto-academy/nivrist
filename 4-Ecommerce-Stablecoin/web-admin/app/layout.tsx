import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/contexts/Web3Context";
import { AdminDataProvider } from "@/contexts/AdminDataContext";
import Shell from "@/components/Shell";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
});
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "EuroChain · Admin",
  description: "Panel de administración de comercios y productos on-chain",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-sans">
        <Web3Provider>
          <AdminDataProvider>
            <Shell>{children}</Shell>
          </AdminDataProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
