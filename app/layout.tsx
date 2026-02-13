import type { Metadata } from "next";
import Link from "next/link";
// import { Space_Grotesk, Inter } from "next/font/google";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["400", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "SSC Rank Predictor",
  description: "Analyze performance metrics and predict rank outcomes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${publicSans.variable} font-sans antialiased selection:bg-yellow-300 selection:text-black`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
