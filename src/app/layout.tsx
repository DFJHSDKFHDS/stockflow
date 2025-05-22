
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Script from "next/script"; // Import Script

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockFlow - Inventory Management",
  description: "Responsive inventory management app by Firebase Studio",
  manifest: "/manifest.json", // Link to manifest for PWA
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#3F51B5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StockFlow" />
        {/* TODO: Replace these placeholder apple-touch-icons with your actual icon files */}
        <link rel="apple-touch-icon" href="https://placehold.co/180x180.png?text=SF" />
        <link rel="apple-touch-icon" sizes="152x152" href="https://placehold.co/152x152.png?text=SF" />
        <link rel="apple-touch-icon" sizes="180x180" href="https://placehold.co/180x180.png?text=SF" />
        <link rel="apple-touch-icon" sizes="167x167" href="https://placehold.co/167x167.png?text=SF" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
          <Toaster />
        </AuthProvider>
        <Script
          id="service-worker-registration"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(error => {
                      console.log('ServiceWorker registration failed: ', error);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
