import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoinFlow - Traceable Real-time Bank & Ledger",
  description: "Experience absolute transparency with individual coin tracing, real-time transfers, savings accounts, and overdraft privileges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
