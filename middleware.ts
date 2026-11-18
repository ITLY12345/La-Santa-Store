import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE_NAME = 'lasanta_admin_session';

const ADMIN_ONLY_API_PREFIXES = ['/api/billing', '/api/inventory', '/api/plugins'];

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  return res;
}

function hasSignedTokenStructure(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (trimmed.length < 30) return false;
  const parts = trimmed.split('.');
  return parts.length === 2 && parts[0].length >= 10 && parts[1].length >= 10;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  const rawCookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const rawHeaderToken = req.headers.get('x-admin-token');
  const hasAdminCredential =
    hasSignedTokenStructure(rawCookieToken) || hasSignedTokenStructure(rawHeaderToken);

  const isStrictlyAdminEndpoint = ADMIN_ONLY_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const isAdminProductMutation =
    pathname.startsWith('/api/products') &&
    (method === 'POST' || method === 'PUT' || method === 'DELETE');

  const isAdminOrderMutation =
    pathname === '/api/orders' && (method === 'PUT' || method === 'DELETE');

  const isAdminStoreMutation =
    pathname.startsWith('/api/store') &&
    (method === 'POST' || method === 'PUT' || method === 'DELETE');

  if (
    (isStrictlyAdminEndpoint || isAdminProductMutation || isAdminOrderMutation || isAdminStoreMutation) &&
    !hasAdminCredential
  ) {
    const unauthorized = NextResponse.json(
      {
        success: false,
        message: 'Acceso denegado en perímetro Edge. Inicia sesión administrativa.',
      },
      { status: 401 }
    );
    return applySecurityHeaders(unauthorized);
  }

  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/).*)',
  ],
};

