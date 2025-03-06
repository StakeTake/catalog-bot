// admin-panel/lib/api.js
export const apiFetch = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem("token");
    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    // Формируем заголовки, объединяя переданные опции с дефолтными
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    // Отправляем запрос на сервер
    const res = await fetch(`${API_URL}/${endpoint}`, {
      ...options,
      headers,
    });

    // Если запрос завершился с ошибкой, пытаемся извлечь текст ошибки и бросаем исключение
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API Error: ${res.status} ${errorText}`);
    }

    // Если статус 204 (No Content) — возвращаем null
    if (res.status === 204) {
      return null;
    }

    // Определяем тип контента, чтобы корректно распарсить ответ
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return res.json();
    } else {
      return res.text();
    }
  } catch (error) {
    console.error("API Fetch Error:", error);
    throw error;
  }
};