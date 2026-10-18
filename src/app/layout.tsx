import type { Metadata, Viewport } from 'next';
import { Anuphan, Hanken_Grotesk, Instrument_Serif } from 'next/font/google';
import './globals.css';

// headlines: a serif with real contrast, roman and italic; text: a plain grotesk; the Thai wordmark: Anuphan
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' });
const sans = Hanken_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-sans', display: 'swap' });
const thai = Anuphan({ subsets: ['thai'], weight: ['400', '500'], variable: '--font-thai', display: 'swap' });

export const metadata: Metadata = {
  title: 'Saeng House · Talat Noi, Bangkok',
  description: 'A twelve-room hotel in a 1922 spice warehouse on the Chao Phraya, lit by red lanterns.',
};

export const viewport: Viewport = {
  themeColor: '#120b09',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // is-loading holds the page still under the lantern loader until the hero photo is ready
    <html lang="en" className={`${serif.variable} ${sans.variable} ${thai.variable} is-loading`}>
      <body>
        <noscript>
          <style>{'.loader { display: none; } html.is-loading { overflow: auto; }'}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
