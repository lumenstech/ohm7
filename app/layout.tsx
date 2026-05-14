import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "ServiceFixes DHT — Property-bound electrical records",
  description:
    "Panel records, service history, and access approvals tied to the property — not the contractor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <Auth0Provider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Auth0Provider>
      </body>
    </html>
  );
}
