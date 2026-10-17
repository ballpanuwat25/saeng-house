import type { Metadata, Viewport } from 'next';
import { Anuphan } from 'next/font/google';
import './globals.css';

const anuphan = Anuphan({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500'],
  variable: '--font-anuphan',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'แสง ตลาดน้อย · Saeng House',
  description: 'โรงแรม 12 ห้องในตึกแถวร้อยปีย่านตลาดน้อย ริมเจ้าพระยา',
};

export const viewport: Viewport = {
  themeColor: '#120b09',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={anuphan.variable}>
      <body>{children}</body>
    </html>
  );
}
