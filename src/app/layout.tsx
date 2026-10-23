import type { Metadata, Viewport } from "next";
import { Lexend, Michroma, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"], display: "swap" });
const michroma = Michroma({ variable: "--font-michroma", subsets: ["latin"], weight: "400", display: "swap" });
const tamil = Noto_Sans_Tamil({ variable: "--font-tamil", subsets: ["tamil"], weight: ["400", "500", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Home 360 — 360° Virtual Home Tour",
  description:
    "Walk through the living room, kitchen and bedroom in an immersive 360° tour with a Tamil AI voice guide and background music.",
  openGraph: {
    title: "Home 360 — 360° Virtual Home Tour",
    description: "Immersive 360° home tour with Tamil voice narration.",
    images: [{ url: "/panoramas/living-room-thumb.jpg", width: 640, height: 400 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lexend.variable} ${michroma.variable} ${tamil.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
