import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cadence — Plan the year. Protect the person.",
  description:
    "Cadence is a planner and consistency tracker for anyone building a routine around a goal that matters to them — students, office workers, and everyone in between. Weekly commitments over daily guilt.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} font-sans antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
