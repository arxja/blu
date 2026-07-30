import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Show fallback text immediately, swap when font loads
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Blu — Turn user behavior into business actions",
  description:
    "Blu is the all-in-one B2B SaaS platform that transforms user behavior into automated business actions in a single multi-tenant system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-text-primary transition-theme">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
