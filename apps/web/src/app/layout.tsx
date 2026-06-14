import type { Metadata } from "next";
import { Space_Grotesk, Instrument_Sans } from "next/font/google";
import PrintQueueBootstrap from "@/components/print/PrintQueueBootstrap";
import { Providers } from "./providers";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import "./globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  preload: false
});

const bodyFont = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  preload: false
});

export const metadata: Metadata = {
  title: "Parkflow Desktop",
  description: "Parking management desktop app - Offline first",
  icons: { icon: "/favicon.svg" }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${displayFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('parkflow-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-ash text-slate-900 antialiased">
        <ThemeProvider>
          <Providers>
            <PrintQueueBootstrap />
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
