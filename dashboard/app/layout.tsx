import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SELENATOR — Quality Assurance, made easy.",
  description: "Robot Framework + Selenium QA automation console.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
