import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Executive Dashboard — KNG Tech',
  description: 'Internal project dashboard for Rental IQ and AwardBook',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="main-content page-enter">
          {children}
        </main>
      </body>
    </html>
  );
}
