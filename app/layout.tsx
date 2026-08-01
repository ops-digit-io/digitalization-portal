import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppHeader } from "@/components/portal/app-header";
import { Telemetry } from "@/components/portal/telemetry";

export const metadata: Metadata = {
  title: "Digitalization Portal",
  description: "The Digitalization Portal — the single front door and control plane for enterprise change demand.",
};

// Set the theme class before hydration to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('du-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <Providers>
          <AppHeader />
          {children}
          <Telemetry />
        </Providers>
      </body>
    </html>
  );
}
