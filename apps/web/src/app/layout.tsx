import type { Metadata } from "next";
import { Space_Grotesk, Instrument_Sans } from "next/font/google";
import PrintQueueBootstrap from "@/components/print/PrintQueueBootstrap";
import { Providers } from "./providers";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import "./globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

const bodyFont = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Parkflow Desktop",
  description: "Parking management desktop app - Offline first"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${displayFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
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
