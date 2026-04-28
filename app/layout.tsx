import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import ThemeProvider from "@/components/ThemeProvider";
import ShortcutsProvider from "@/components/ShortcutsProvider";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bamboo",
  description: "Personal book tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 min-h-screen`}>
        <ThemeProvider>
          <ShortcutsProvider>
            <Nav />
            <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
          </ShortcutsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
