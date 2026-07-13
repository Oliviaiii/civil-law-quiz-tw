import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://oliviaiii1224.github.io/civil-law-quiz-tw/"),
  title: "民法研習室｜法院書記官民法考古題練習",
  description: "收錄近十年司法特考四等法院書記官民法概要官方考古題與標準答案，並在瀏覽器保存錯題與學習進度。",
  openGraph: {
    title: "民法研習室｜法院書記官民法考古題練習",
    description: "民國 105–114 年司法特考四等法院書記官民法概要，含 175 題選擇題與 26 題申論題。",
    images: [{ url: "https://oliviaiii1224.github.io/civil-law-quiz-tw/og.png", width: 1200, height: 630, alt: "民法研習室" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "民法研習室｜法院書記官民法考古題練習",
    description: "民國 105–114 年司法特考四等法院書記官民法概要，含 175 題選擇題與 26 題申論題。",
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
