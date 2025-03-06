// admin-panel/pages/dashboard.js
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/stats/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Не удалось загрузить статистику');
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Ошибка загрузки статистики:", err);
      setError(err.message || 'Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Статистика</h1>
        <button 
          onClick={fetchStats} 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
        >
          Обновить
        </button>
      </div>

      {loading && (
        <div className="text-gray-500">Загрузка...</div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-600 border border-red-300 rounded">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="bg-white shadow p-4 rounded">
              <div className="text-gray-500 uppercase text-sm mb-1">{key}</div>
              <div className="text-3xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
