import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'J.A.R.V.I.S. ULTRA',
  description: 'Personal AI assistant · Google Gemini',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#02060f', width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className="scan-lines">{children}</body></html>);
}
