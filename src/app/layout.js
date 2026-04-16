import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import AppProviders from "./providers";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata = {
  title: "Pokedex Drift",
  description:
    "A creative Pokemon exploration app with React Query, deep detail views, and a live team builder.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
