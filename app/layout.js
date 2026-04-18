import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import OfflineBanner from "./components/OfflineBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "APUdesk — Presupuestos de construcción con IA",
  description: "Plataforma inteligente para crear presupuestos APU, carta Gantt, especificaciones técnicas y gestión de obras de construcción en Chile.",
  keywords: "APU, presupuesto construcción, carta gantt, análisis precios unitarios, Chile",
  openGraph: {
    title: "APUdesk — Presupuestos de construcción con IA",
    description: "Plataforma inteligente para crear presupuestos APU, carta Gantt y gestión de obras.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <OfflineBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
