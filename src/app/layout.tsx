import type { Metadata } from "next";
import { ThemeSync } from "@/components/theme-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agora Conversational AI Studio API Demo",
  description:
    "Create and test voice agents, manage Studio resources, and launch outbound calling campaigns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground min-h-screen antialiased">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
