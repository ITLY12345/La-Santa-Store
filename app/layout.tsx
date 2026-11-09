import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_URL || 'https://lasantastore.enigmaproducciones.com'
  ),
  title: {
    default: 'La Santa Store | Moda Urbana & Streetwear · Cartagena de Indias',
    template: '%s | La Santa Store',
  },
  description:
    'Tienda oficial de La Santa Store en Cartagena de Indias. Camisetas Oversize, Bolsos Tote y Chanclas Slides de diseño contemporáneo con despachos nacionales en toda Colombia.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/assets/brand/logo-la-santa.png',
    apple: '/assets/brand/logo-la-santa.png',
  },
  openGraph: {
    title: 'La Santa Store | Moda Urbana & Streetwear · Cartagena de Indias',
    description:
      'Camisetas Oversize, Bolsos y Chanclas con stock verificado en tiempo real y despachos nacionales desde Cartagena de Indias.',
    url: 'https://lasantastore.enigmaproducciones.com',
    siteName: 'La Santa Store',
    locale: 'es_CO',
    type: 'website',
    images: [
      {
        url: '/assets/brand/logo-la-santa.png',
        width: 512,
        height: 512,
        alt: 'La Santa Store · Cartagena de Indias',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'La Santa Store | Moda Urbana & Streetwear · Cartagena de Indias',
    description:
      'Camisetas Oversize, Bolsos y Chanclas con despachos nacionales desde Cartagena de Indias.',
    images: ['/assets/brand/logo-la-santa.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'La Santa Store',
  },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className="min-h-screen bg-white text-[#111111] antialiased selection:bg-[#111111] selection:text-white">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
