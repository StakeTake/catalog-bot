// admin-panel/pages/logout.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function LogoutPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Выход из системы...');

  useEffect(() => {
    // Удаляем токен из cookie и localStorage
    document.cookie = 'token=; Path=/; Max-Age=0';
    localStorage.removeItem('token');

    // Обновляем сообщение для пользователя
    setMessage('Вы успешно вышли. Перенаправляем на страницу логина...');
    // Задержка перед редиректом для плавного UX
    const timer = setTimeout(() => {
      router.push('/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Выход из системы</h1>
        <p className="text-gray-600">{message}</p>
        <div className="mt-4">
          {/* Анимированный индикатор загрузки */}
          <svg
            className="animate-spin h-8 w-8 text-blue-500 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
        </div>
      </div>
    </div>
  );
}
