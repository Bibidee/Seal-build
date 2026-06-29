import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/context/WalletContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { WalletBar } from "@/components/layout/WalletBar";

export const metadata: Metadata = {
  title: "Seal — Delivery Acceptance Dock",
  description: "Fund work in GEN, define acceptance criteria, submit delivery evidence, and let GenLayer validators judge whether payment should be released, revised, split, or refunded.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <Sidebar />
          <div className="ml-52 min-h-screen flex flex-col">
            <header className="sticky top-0 z-30 bg-[#080B10]/95 backdrop-blur border-b border-[#182030] px-6 py-2.5 flex items-center justify-between">
              <div className="manifest-label tracking-widest">SEAL DELIVERY DOCK · GENLAYER STUDIONET</div>
              <WalletBar />
            </header>
            <main className="flex-1 px-6 py-6">{children}</main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
