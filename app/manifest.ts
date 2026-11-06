import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'La Santa Store - Streetwear & WhatsApp Shop',
    short_name: 'LaSanta',
    description: 'Tienda oficial de streetwear y calzado urbano La Santa Store. Pedidos directos a WhatsApp.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#d4af37',
    icons: [
      {
        src: '/assets/brand/logo-la-santa.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/assets/brand/logo-la-santa.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
