import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "KD EXPORT | Banana Supply Chain Platform",
    template: "%s | KD EXPORT",
  },
  description:
    "Official KD EXPORT Agricultural Supply Chain & Cold Storage Management System — Procurement, Harvesting, Quality Control & Dispatch.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "KD EXPORT",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${inter.variable} ${plusJakarta.variable} font-sans bg-slate-50 text-slate-900 antialiased`}
      >
        {children}
        <Toaster richColors position="top-right" />

        {/* Service Worker & System Drawer Notification Request Registration */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(reg) {
                  if ('Notification' in window && Notification.permission === 'default') {
                    // Prompt user to enable system notifications
                    Notification.requestPermission();
                  }
                }).catch(function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
