// admin-panel/middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Пропускаем запросы к ресурсам Next.js и статическим файлам,
  // чтобы не применять аутентификацию к запросам к этим путям.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // Получаем токен из cookie
  const token = request.cookies.get('token');

  // Если пользователь не аутентифицирован и запрашивает защищённую страницу,
  // перенаправляем на страницу логина.
  if (!token && pathname !== '/login') {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Если пользователь аутентифицирован и пытается попасть на страницу логина,
  // перенаправляем его на дашборд.
  if (token && pathname === '/login') {
    const dashUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashUrl);
  }

  // Если всё в порядке, пропускаем запрос дальше.
  return NextResponse.next();
}
