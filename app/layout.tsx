import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kill - Online Multiplayer Board Game",
  description: "Play the classic Kill board game online with friends. Real-time multiplayer, mobile-friendly, no account required.",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
