import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://oliviaiii1224.github.io/civil-law-quiz-tw/"),
  title: "民法研習室｜台灣民法選擇題練習",
  description: "以爭點、法律規則與涵攝拆解台灣民法選擇題，並在瀏覽器保存錯題與學習進度。",
  openGraph: {
    title: "民法研習室｜台灣民法選擇題練習",
    description: "先判斷爭點，再選答案。作答後立即看見法律規則與涵攝。",
    images: [{ url: "https://oliviaiii1224.github.io/civil-law-quiz-tw/og.png", width: 1200, height: 630, alt: "民法研習室" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "民法研習室｜台灣民法選擇題練習",
    description: "先判斷爭點，再選答案。作答後立即看見法律規則與涵攝。",
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
