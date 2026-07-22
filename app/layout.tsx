import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Unit Portal",
  description: "The single front door and control plane for enterprise change demand.",
};

function TopNav() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-6 place-items-center rounded bg-primary text-xs text-primary-foreground">
            DU
          </span>
          Digital Unit Portal
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/board" className="hover:text-foreground">Portfolio</Link>
          <Link href="/analysis" className="hover:text-foreground">Analysis</Link>
          <Link href="/" className="hover:text-foreground">Assistant</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">demo.forum@example.com</span>
          <span className="grid size-7 place-items-center rounded-full bg-secondary text-[11px] font-medium text-secondary-foreground">
            DF
          </span>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
