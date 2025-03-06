import { useRouter } from "next/router";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Пожалуйста, заполните оба поля.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.detail || "Неверные учетные данные");
        setLoading(false);
        return;
      }

      const data = await res.json();
      // Сохраняем токен
      document.cookie = `token=${data.access_token}; Path=/; Max-Age=3600;`;
      localStorage.setItem("token", data.access_token);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  // Телеграм-виджет, только на клиенте
  useEffect(() => {
    // Создаём <script> для Telegram
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?19";
    script.async = true;
    script.setAttribute("data-telegram-login", "rqwereqwer_bot"); 
    script.setAttribute("data-size", "large");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-userpic", "false");
    // При авторизации виджет вызовет onTelegramAuth
    script.setAttribute("data-onauth", "onTelegramAuth(user)");

    // Вставляем скрипт в наш div
    const container = document.getElementById("telegram-login-btn");
    if (container) {
      container.innerHTML = ""; // если надо очистить перед вставкой
      container.appendChild(script);
    }

    // Глобальная функция
    window.onTelegramAuth = (user) => {
      // user = { id, first_name, username, photo_url, auth_date, hash, ...}
      console.log("Telegram user data:", user);
      handleTelegramUser(user);
    };
  }, []);

  const handleTelegramUser = async (tgUser) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tgUser),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.detail || "Ошибка при Telegram-входе");
        setLoading(false);
        return;
      }

      const data = await res.json();
      document.cookie = `token=${data.access_token}; Path=/; Max-Age=3600;`;
      localStorage.setItem("token", data.access_token);
      router.push("/dashboard");
    } catch (err) {
      console.error("TG login error:", err);
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Вход в админку</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 border border-red-300 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 mb-2">
              Логин
            </label>
            <input
              type="text"
              id="username"
              placeholder="Введите логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 mb-2">
              Пароль
            </label>
            <input
              type="password"
              id="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 mb-2">Или войдите через Telegram:</p>
          <div id="telegram-login-btn"></div>
          {/* Виджет вставит свою кнопку */}
        </div>
      </div>
    </div>
  );
}
