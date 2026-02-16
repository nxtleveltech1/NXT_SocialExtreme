import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NXT Social Extreme - Social Media Marketing",
  description: "Manage your Facebook, Instagram, TikTok, and WhatsApp channels with extreme precision.",
};

function ClerkWrapper({ children }: { children: React.ReactNode }) {
  try {
    const {
      ClerkProvider,
      SignedIn,
      SignedOut,
    } = require("@clerk/nextjs");

    return (
      <ClerkProvider
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      >
        {children}
      </ClerkProvider>
    );
  } catch {
    return <>{children}</>;
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}>
        <ClerkWrapper>
          <QueryProvider>
            <Toaster position="top-right" richColors />
            {children}
          </QueryProvider>
        </ClerkWrapper>
      </body>
    </html>
  );
}
