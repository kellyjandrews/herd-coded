import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "AI Code Factory",
  description: "Create apps and let Copilot build features remotely",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
