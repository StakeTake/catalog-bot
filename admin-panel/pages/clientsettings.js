// admin-panel/pages/clientsettings.js
import { useState, useEffect } from 'react';

export default function ClientSettings() {
  const [clientData, setClientData] = useState({
    id: '',
    name: '',
    telegram_token: '',
    payment_provider_token: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [runningBot, setRunningBot] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // Функция загрузки данных клиента
  const fetchClientData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/client/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Не удалось загрузить данные клиента');
      }
      const data = await res.json();
      setClientData(data);
    } catch (err) {
      console.error('Ошибка при загрузке данных клиента:', err);
      setError(err.message || 'Ошибка при загрузке данных клиента');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [API_URL]);

  // Функция для обновления данных клиента
  const updateClient = async () => {
    setUpdating(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/client/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          telegram_token: clientData.telegram_token,
          payment_provider_token: clientData.payment_provider_token
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Ошибка обновления настроек клиента');
      }
      const data = await res.json();
      setClientData(data);
      setSuccess('Настройки клиента обновлены');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ошибка обновления настроек клиента');
    } finally {
      setUpdating(false);
    }
  };

  // Функция для запуска бота
  const runBot = async () => {
    setRunningBot(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/client/me/bot/run`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Ошибка при запуске бота');
      }
      const data = await res.json();
      setSuccess(`Бот запущен успешно: ${data.container_name || ''}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ошибка при запуске бота');
    } finally {
      setRunningBot(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">Настройки клиента</h1>

      {/* Сообщения об ошибке и успехе */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-600 border border-red-300 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-600 border border-green-300 rounded">
          {success}
        </div>
      )}

      <div className="mb-4">
        <p>
          <strong>ID клиента:</strong> {clientData.id}
        </p>
        <p>
          <strong>Название (name):</strong> {clientData.name}
        </p>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium text-gray-700">Telegram Token</label>
        <input
          type="text"
          value={clientData.telegram_token || ''}
          onChange={(e) =>
            setClientData({ ...clientData, telegram_token: e.target.value })
          }
          className="w-full border p-2 rounded focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Введите Telegram Token"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium text-gray-700">Payment Provider Token</label>
        <input
          type="text"
          value={clientData.payment_provider_token || ''}
          onChange={(e) =>
            setClientData({ ...clientData, payment_provider_token: e.target.value })
          }
          className="w-full border p-2 rounded focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Введите Payment Provider Token"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          onClick={updateClient}
          disabled={updating}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
        >
          {updating ? 'Сохранение...' : 'Сохранить'}
        </button>

        <button
          onClick={runBot}
          disabled={runningBot}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
        >
          {runningBot ? 'Запуск бота...' : 'Запустить бота'}
        </button>
      </div>
    </div>
  );
}
