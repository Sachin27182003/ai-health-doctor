import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "../globals.css";
// import "./globals.css"

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Health",
  description: "An AI-powered platform for mock medical assistance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning
        className={`${monaSans.className} antialiased pattern`}
      >
        {/* Navbar moved here */}
        {/* <nav className="root-layout">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Health Ally Logo" width={38} height={32} />
            <h2 className="text-primary-100">Health Ally</h2>
          </Link>
        </nav> */}

        {/* <main className="root-layout">{children}</main> */}
        <div className="root-layout">
      <nav>
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
          <h2 className="text-primary-100">Health Ally</h2>
        </Link>
      </nav>

      {children}
    </div>

        <Toaster />
      </body>
    </html>
  );
}
