import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ledger-able — Simple small-business accounting",
  description: "Track sales, expenses, invoices, tax estimates and business performance in one calm workspace.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">{children}</body>
    </html>
  );
}
