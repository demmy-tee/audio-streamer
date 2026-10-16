import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Audio Commitments Streamer",
  description: "Extract verifiable commitments, owners, deadlines, and timestamped audio citations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
