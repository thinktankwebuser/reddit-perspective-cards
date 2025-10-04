import type { Metadata } from 'next';
import './globals.css';
import { initSentry } from '@/lib/sentry';

// Initialize Sentry for error monitoring
if (typeof window !== 'undefined') {
  initSentry();
}

export const metadata: Metadata = {
  title: 'Reddit Perspective Cards',
  description: 'AI-generated summaries of trending Reddit discussions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
