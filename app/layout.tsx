import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { ConfirmProvider } from '@/hooks/use-confirm';
import { ThemeToggle } from '@/components/theme-toggle';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Topladder',
  description: 'The premium queue management system for your matches.',
  icons: {
    icon: '/TopLadderLogo.png',
    shortcut: '/TopLadderLogo.png',
    apple: '/TopLadderLogo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang='en'>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ConfirmProvider>
            {children}
            <ThemeToggle />
          </ConfirmProvider>
          <Toaster richColors position='top-right' />
        </body>
      </html>
    </ClerkProvider>
  );
}