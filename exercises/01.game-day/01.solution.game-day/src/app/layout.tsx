import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@bigpdf/lab-core/ui/app.css';

export const metadata: Metadata = {
  title: 'Bigpdf payments console (reference)',
  description: 'Reference implementation for exercise 01, the payments game day.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // suppressHydrationWarning is required by next-themes: it sets the theme class on
  // <html> before React hydrates, so the server and client markup differ by design.
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
