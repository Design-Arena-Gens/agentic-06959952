import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Warehouse Inventory - Realtime (Morning/Night)',
  description: 'Realtime inventory dashboard with scheduled morning/night updates.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
