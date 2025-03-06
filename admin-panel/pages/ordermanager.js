import { useEffect, useState } from 'react';

export default function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error("Не удалось загрузить заказы");
      }
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Ошибка загрузки заказов:", err);
      setError(err.message || "Ошибка загрузки заказов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [API_URL]);

  // Опционально: можем сделать кнопку для смены статуса
  const changeStatus = async (orderId, newStatus) => {
    if (!confirm(`Вы действительно хотите изменить статус заказа #${orderId} на "${newStatus}"?`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders/${orderId}/status?new_status=${newStatus}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ошибка при смене статуса");
      }
      const responseData = await res.json();
      setSuccess(responseData.detail || "Статус изменён");

      // Обновим список
      fetchOrders();

    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка при смене статуса");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Управление заказами</h1>

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

      <button 
        onClick={fetchOrders}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        Обновить
      </button>

      {loading ? (
        <div>Загрузка заказов...</div>
      ) : (
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b">ID</th>
              <th className="px-4 py-2 border-b">Товар (ID)</th>
              <th className="px-4 py-2 border-b">Статус</th>
              <th className="px-4 py-2 border-b">Создан</th>
              <th className="px-4 py-2 border-b">Действия</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="text-center">
                <td className="px-4 py-2 border-b">{order.id}</td>
                <td className="px-4 py-2 border-b">{order.product_id}</td>
                <td className="px-4 py-2 border-b">{order.status}</td>
                <td className="px-4 py-2 border-b">
                  {new Date(order.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 border-b">
                  {order.status !== "paid" && (
                    <button
                      onClick={() => changeStatus(order.id, "paid")}
                      className="mr-2 text-green-500 hover:text-green-700 text-sm"
                    >
                      Пометить оплаченным
                    </button>
                  )}
                  {order.status !== "pending" && (
                    <button
                      onClick={() => changeStatus(order.id, "pending")}
                      className="mr-2 text-blue-500 hover:text-blue-700 text-sm"
                    >
                      Pending
                    </button>
                  )}
                  {order.status !== "failed" && (
                    <button
                      onClick={() => changeStatus(order.id, "failed")}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Отменить
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {orders.length === 0 && (
              <tr>
                <td colSpan="5" className="py-4 text-gray-500">
                  Заказы отсутствуют
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
