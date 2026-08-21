import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/toast";
import { ClerkTokenBridge } from "@/components/clerk-token-bridge";
import { AccentApplier } from "@/components/accent-applier";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
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
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} ${sourceSerif.variable} font-sans antialiased`}
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        </head>
        <body className="min-h-full flex flex-col">
          <ClerkTokenBridge />
          <StoreProvider>
            <AccentApplier />
            <ToastProvider>{children}</ToastProvider>
          </StoreProvider>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
