import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./game-night.css";

const title = "Kill — The marble game of calculated revenge";
const description = "Play Kill online with friends or practice against bots. Five marbles, ruthless shortcuts, one way to get Up Tight.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og-release.png`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1672, height: 941, alt: "Kill marble board game on a walnut game-night table" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
