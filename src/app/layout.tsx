import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/Providers";
import { Shell } from "@/components/Shell";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Streamly — смотрите, загружайте, делитесь",
    template: "%s · Streamly",
  },
  description:
    "Streamly — современная видеоплатформа: смотрите видео, подписывайтесь на каналы, создавайте плейлисты и делитесь своим контентом.",
  openGraph: {
    siteName: "Streamly",
    type: "website",
    locale: "ru_RU",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Устанавливает тему до гидрации, чтобы избежать мигания
const themeScript = `(function(){try{var t=localStorage.getItem('sf-theme')||'dark';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.variable} font-[family-name:var(--font-inter)] bg-base text-base antialiased`}
      >
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
