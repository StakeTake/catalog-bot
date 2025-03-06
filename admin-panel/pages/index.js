// admin-panel/pages/index.js
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-xl w-full text-center">
        <h1 className="text-3xl font-bold mb-4">Добро пожаловать в админ-панель</h1>
        <p className="text-gray-600 mb-6">
          Войдите, чтобы настроить своего бота, управлять категориями, товарами и просматривать статистику.
        </p>
        <Link href="/login">
          <a className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded transition-colors">
            Войти
          </a>
        </Link>
      </div>
    </div>
  );
}
