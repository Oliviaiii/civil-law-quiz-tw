import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://oliviaiii1224.github.io/civil-law-quiz-tw/"),
  title: "書記官法科研習室｜五科近十年考古題",
  description: "收錄近十年司法特考四等法院書記官民法、刑法、憲法、法學緒論與英文官方考古題、標準答案及解析，並分科保存錯題與學習進度。",
  openGraph: {
    title: "書記官法科研習室｜五科近十年考古題",
    description: "民國 105–114 年司法特考四等民法、刑法、憲法、法學緒論與英文，共 902 題官方試題。",
    images: [{ url: "https://oliviaiii1224.github.io/civil-law-quiz-tw/og-multisubject.png", width: 1200, height: 630, alt: "書記官法科研習室" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "書記官法科研習室｜五科近十年考古題",
    description: "民國 105–114 年司法特考四等民法、刑法、憲法、法學緒論與英文，共 902 題官方試題。",
    images: ["https://oliviaiii1224.github.io/civil-law-quiz-tw/og-multisubject.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
