import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PG Manager - Complete PG & Property Management",
  description: "Enterprise-grade PG and property management software for modern coliving, student housing, and hostels.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="suppress-extension-errors"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Suppress runtime collisions from third-party Web3 browser extensions (Phantom, MetaMask, evmAsk)
                  window.addEventListener('error', function(e) {
                    var isExt = e.filename && (e.filename.indexOf('chrome-extension://') !== -1 || e.filename.indexOf('moz-extension://') !== -1);
                    var isEth = e.message && (e.message.indexOf('Cannot redefine property: ethereum') !== -1 || e.message.indexOf('ethereum') !== -1);
                    if (isExt || isEth) {
                      e.stopImmediatePropagation();
                      e.preventDefault();
                      return true;
                    }
                  }, true);

                  window.addEventListener('unhandledrejection', function(e) {
                    var reason = e.reason && (e.reason.message || e.reason.stack || String(e.reason));
                    if (reason && (reason.indexOf('Cannot redefine property: ethereum') !== -1 || reason.indexOf('chrome-extension://') !== -1)) {
                      e.stopImmediatePropagation();
                      e.preventDefault();
                    }
                  }, true);
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground" suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
