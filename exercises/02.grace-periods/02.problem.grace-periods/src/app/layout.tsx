import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@bigpdf/lab-core/ui/app.css';

export const metadata: Metadata = {
  title: 'Bigpdf billing console (starter)',
  description: 'Exercise 02: grace periods and the rail that answers late.',
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
