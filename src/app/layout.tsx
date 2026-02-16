import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import Sidebar from "@/components/Sidebar";
import AuthButton from "@/components/AuthButton";
import ErrorBoundary from "@/components/ErrorBoundary";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userName = "User";
  try {
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();
    if (user) {
      userName = user.firstName || user.emailAddresses?.[0]?.emailAddress || "User";
    }
  } catch {
    // Clerk not available — continue
  }

  return (
    <ClerkProvider
      proxyUrl={process.env.NEXT_PUBLIC_CLERK_PROXY_URL}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}>
          <QueryProvider>
            <Toaster position="top-right" richColors />

            <SignedIn>
              <div className="flex h-screen overflow-hidden">
                <Sidebar />

                <div className="flex flex-col flex-1 w-full overflow-hidden">
                  <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border">
                    <div className="lg:hidden flex items-center">
                      <span className="text-xl font-extrabold tracking-tight">
                        <span className="text-red-800">NXT</span>
                        <span className="text-gray-500 mx-1">Social</span>
                        <span className="text-red-700 italic">Extreme</span>
                      </span>
                    </div>
                    <div className="hidden lg:block">
                      <h2 className="text-lg font-semibold text-foreground">
                        Welcome back, {userName}
                      </h2>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <span className="sr-only">Notifications</span>
                        <div className="w-2 h-2 bg-red-500 rounded-full absolute translate-x-3 -translate-y-1 border-2 border-white" />
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </button>
                      <Suspense fallback={<div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />}>
                        <AuthButton />
                      </Suspense>
                    </div>
                  </header>

                  <main className="flex-1 overflow-y-auto p-6">
                    <ErrorBoundary>
                      {children}
                    </ErrorBoundary>
                  </main>
                </div>
              </div>
            </SignedIn>

            <SignedOut>
              {children}
            </SignedOut>

          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
