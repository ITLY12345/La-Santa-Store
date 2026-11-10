import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL || 'https://lasantastore.enigmaproducciones.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/pos', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

