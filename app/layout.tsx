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
    icon: '/assets/aistudio/file_00000000abd081f5882f0c7a3c3bc919_68d1d587.png',
    apple: '/assets/aistudio/file_00000000abd081f5882f0c7a3c3bc919_68d1d587.png',
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
