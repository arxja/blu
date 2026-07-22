import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Show fallback text immediately, swap when font loads
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Blu",
  description: "Multi-Tenant SaaS Starter Kit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-text-primary transition-theme">
        {children}
      </body>
    </html>
  );
}
