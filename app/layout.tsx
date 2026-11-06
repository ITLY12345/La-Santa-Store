import type {Metadata, Viewport} from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Mobile Ecommerce App | Catálogo Oficial',
  description:
    'Catálogo móvil minimalista con inventario en tiempo real y pedidos directos por WhatsApp.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/assets/brand/logo-la-santa.png',
    apple: '/assets/brand/logo-la-santa.png',
  },
  openGraph: {
    title: 'Mobile Ecommerce App | Catálogo Oficial',
    description:
      'Catálogo móvil minimalista con inventario en tiempo real y pedidos directos por WhatsApp.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mobile Ecommerce App',
    description: 'Catálogo móvil minimalista con pedido directo por WhatsApp.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es">
      <body
        className="bg-[#FFFFFF] text-[#111111] antialiased min-h-screen selection:bg-[#111111] selection:text-white"
        suppressHydrationWarning
      >
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
