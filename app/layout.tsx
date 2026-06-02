import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEON Dial — Business Operating System",
  description: "AI-native CRM, intelligence, finance, bidding, and dialer in one shell.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
