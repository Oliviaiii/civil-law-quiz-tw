import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://oliviaiii1224.github.io/civil-law-quiz-tw/"),
  title: "書記官研習室｜司法特考四等民刑法考古題",
  description: "收錄近十年司法特考四等法院書記官民法概要與刑法概要官方考古題、標準答案及逐題解析。",
  openGraph: {
    title: "書記官研習室｜司法特考四等民刑法考古題",
    description: "民國 105–114 年法院書記官民法概要與刑法概要，共 350 題選擇題與 52 題申論題。",
    images: [{ url: "https://oliviaiii1224.github.io/civil-law-quiz-tw/og.png", width: 1200, height: 630, alt: "書記官研習室" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "書記官研習室｜司法特考四等民刑法考古題",
    description: "民國 105–114 年法院書記官民法概要與刑法概要，共 350 題選擇題與 52 題申論題。",
    images: ["https://oliviaiii1224.github.io/civil-law-quiz-tw/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
