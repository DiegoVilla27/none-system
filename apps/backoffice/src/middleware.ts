import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Rutas públicas del backoffice que NO requieren autenticación previa.
 */
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

/**
 * Next.js Edge Middleware Guard:
 * 1. Protege todas las rutas privadas del backoffice (Dashboard, Gastos, Escáner, Perfil, etc.).
 * 2. Si el usuario NO tiene cookie de sesión válida ('none_auth_token'), lo redirige inmediatamente a /login.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('none_auth_token')?.value;

  // Ignorar archivos estáticos de Next.js, favicons e imágenes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // 1. Guard de Rutas Protegidas: Bloquear si no hay token de autenticación
  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Nota: no se redirige desde /login cuando hay cookie, porque la sesión pudo ser revocada
  // (cambio de contraseña, cerrar todas las sesiones). La página de login redirige si /auth/me responde.

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica el Guard en todas las rutas excepto:
     * - _next/static (archivos estáticos compilados)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, svgs, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
