import '@/styles/globals.css';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/dashboard', label: '📊 Статистика' },
  { href: '/productmanager', label: '📦 Товары' },
  { href: '/categorymanager', label: '📂 Категории' },
  { href: '/payment', label: '💳 Оплаты' },
  { href: '/ordermanager', label: '📝 Заказы' },
  { href: '/clientsettings', label: '⚙️ Настройки' },
  { href: '/logout', label: '🚪 Выйти', extraClass: 'text-red-400' },
];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Список маршрутов, где НЕ показываем сайтбар
  const noSidebarRoutes = ['/login'];

  // Если маршрут в этом списке, сайтбар скрываем:
  const shouldHideSidebar = noSidebarRoutes.includes(router.pathname);

  // Следим за токеном, но только на клиенте (useEffect)
  useEffect(() => {
    // Если мы НЕ на /login, тогда проверяем наличие токена
    if (!noSidebarRoutes.includes(router.pathname)) {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
      }
    }
  }, [router]);

  return (
    <div className="flex min-h-screen">
      {/* Сайтбар рендерим, только если не shouldHideSidebar */}
      {!shouldHideSidebar && (
        <div
          className={`fixed inset-y-0 left-0 transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } transition duration-200 ease-in-out bg-gray-900 text-white w-64 z-50 md:relative md:translate-x-0`}
        >
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Админка</h2>
            <nav>
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <span
                        className={`block p-2 rounded hover:bg-gray-700 ${
                          router.pathname === item.href ? 'bg-gray-700' : ''
                        } ${item.extraClass || ''}`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Основной контент занимает оставшееся место */}
      <div className={`flex-1 ${!shouldHideSidebar ? 'ml-64' : ''}`}>
        {/* Заголовок для мобильных устройств */}
        {!shouldHideSidebar && (
          <div className="md:hidden bg-gray-900 text-white p-4 flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-4 focus:outline-none"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </button>
            <h1 className="text-lg font-bold">Админка</h1>
          </div>
        )}

        <main className="p-4">
          <Component {...pageProps} />
        </main>
      </div>
    </div>
  );
}
