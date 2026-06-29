import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/context/WalletContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { WalletBar } from "@/components/layout/WalletBar";

export const metadata: Metadata = {
  title: "Seal — GEN-Backed Delivery Acceptance Protocol",
  description: "Fund work in GEN, define acceptance criteria, receive delivery evidence, and let GenLayer judge whether payment should be released, revised, split, or refunded.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <Sidebar />
          <div className="ml-56 min-h-screen flex flex-col">
            <header className="sticky top-0 z-30 bg-[#07080C]/90 backdrop-blur border-b border-[#1e293b] px-6 py-3 flex items-center justify-between">
              <div />
              <WalletBar />
            </header>
            <main className="flex-1 px-6 py-6">{children}</main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
