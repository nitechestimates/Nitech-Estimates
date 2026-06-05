import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nitech Estimates",
  description: "Professional construction estimate builder — create detailed estimates, rate analysis, measurement sheets, billing, and PDF reports.",
  robots: "noindex, nofollow",
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
    >
      <body className="min-h-full flex flex-col bg-slate-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-200 text-slate-900 selection:bg-blue-200">
        <Providers>
          {/* This is the ONLY place <Navbar /> should be called in your app */}
          <Navbar />
          <main className="flex-1 flex flex-col relative">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}