import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jbm = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "song bracket",
  description: "vote an artist's top 64 down to one",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jbm.variable}>
      <body className="font-mono antialiased">{children}</body>
    </html>
  );
}
