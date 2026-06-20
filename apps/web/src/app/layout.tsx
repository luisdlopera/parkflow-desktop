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
  title: {
    default: "ParkFlow",
    template: "%s | ParkFlow",
  },
  description: "Sistema de gestión de parqueaderos — offline-first, tiempo real",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${displayFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
        />
        <meta
          httpEquiv="Permissions-Policy"
          content="camera=(), microphone=(), geolocation=(self), payment=(), usb=(), midi=(), sync-xhr=(self)"
        />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('parkflow-theme-store'));var t=s&&s.state&&s.state.theme;var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-ash text-ink antialiased">
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
