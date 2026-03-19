import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono  = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'foodashh POS',
  description: 'Restaurant Point of Sale System',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans bg-zinc-950 text-white antialiased`}>
        <div className="flex h-screen overflow-hidden">
          <Navbar />
          {/* Offset for sidebar: 0 on mobile (bottom nav), 14 on md, 56 on lg */}
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0 md:ml-14 lg:ml-56">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
