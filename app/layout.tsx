import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "./components/ServiceWorkerRegistration";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const cloudflareWebAnalyticsToken =
  process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;

export const viewport: Viewport = {
  themeColor: "#d35432",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://oliviaiii.github.io/civil-law-quiz-tw/"),
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: `${basePath}/icon-192.png`,
    apple: `${basePath}/icon-192.png`,
  },
  title: "書記官法科研習室｜九科近十年考古題",
  description: "收錄近十年司法特考四等法院書記官九科官方考古題、標準答案及解析，並分科保存錯題、閱讀與學習進度。",
  openGraph: {
    title: "書記官法科研習室｜九科近十年考古題",
    description: "民國 105–114 年司法特考四等法院書記官九科，共 1,090 題官方試題。",
    images: [{ url: "https://oliviaiii.github.io/civil-law-quiz-tw/og-multisubject.png", width: 1200, height: 630, alt: "書記官法科研習室" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "書記官法科研習室｜九科近十年考古題",
    description: "民國 105–114 年司法特考四等法院書記官九科，共 1,090 題官方試題。",
    images: ["https://oliviaiii.github.io/civil-law-quiz-tw/og-multisubject.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        {/* 首次繪製前套用已保存的主題，避免深色使用者看到亮暗閃爍。 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var p=JSON.parse(localStorage.getItem("civil-law-quiz-tw:preferences:v1")||"{}");if(p.theme==="dark"||p.theme==="light"){document.documentElement.dataset.theme=p.theme;}}catch(e){}',
          }}
        />
        <ServiceWorkerRegistration />
        {children}
        {cloudflareWebAnalyticsToken ? (
          <script
            type="module"
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cloudflareWebAnalyticsToken })}
          />
        ) : null}
      </body>
    </html>
  );
}
