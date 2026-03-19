import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'foodashh POS',
  description: 'Restaurant Point of Sale System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans bg-zinc-950 text-white antialiased`}>
        <div className="flex h-screen overflow-hidden">
          <Navbar />
          <main className="flex-1 ml-16 lg:ml-56 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
