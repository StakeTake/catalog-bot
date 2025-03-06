// admin-panel/pages/payment.js
import { useState, useEffect } from 'react';

export default function PaymentSettings() {
  const [configs, setConfigs] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("robokassa"); 
  const [apiKey, setApiKey] = useState("");
  const [robokassaPasswords, setRobokassaPasswords] = useState({
    password1: "",
    password2: "",
  });
  const [coinPaymentsData, setCoinPaymentsData] = useState({
    private_key: "",
    ipn_secret: "",
    merchant_id: "",
  });

  // Для редактирования существующего PaymentConfig
  const [editConfig, setEditConfig] = useState(null);

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ---- 1) Загрузка списка конфигураций ----
  const fetchConfigs = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/payment/`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Не удалось загрузить настройки платежей");
      }
      const data = await res.json();
      setConfigs(data);
    } catch (err) {
      console.error("Ошибка загрузки настроек платежей:", err);
      setError(err.message || "Ошибка загрузки настроек платежей");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [API_URL]);

  // ---- 2) Добавление нового провайдера ----
  const addConfig = async () => {
    setError("");
    setSuccess("");

    if (!selectedProvider.trim()) {
      setError("Нужно выбрать провайдера");
      return;
    }
    if (!apiKey.trim()) {
      setError("Поле API Key обязательно");
      return;
    }

    setAdding(true);

    // Собираем extra_config в зависимости от провайдера
    let extra_config = {};

    if (selectedProvider === "robokassa") {
      extra_config = {
        password1: robokassaPasswords.password1,
        password2: robokassaPasswords.password2,
      };
    } else if (selectedProvider === "coinpayments") {
      extra_config = {
        private_key: coinPaymentsData.private_key,
        ipn_secret: coinPaymentsData.ipn_secret,
        merchant_id: coinPaymentsData.merchant_id,
      };
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/payment/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider_name: selectedProvider,
          api_key: apiKey,
          extra_config: JSON.stringify(extra_config),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Ошибка при добавлении настроек");
      }

      const data = await res.json();
      setConfigs([...configs, data]);
      // Сбрасываем поля
      setSelectedProvider("robokassa");
      setApiKey("");
      setRobokassaPasswords({ password1: "", password2: "" });
      setCoinPaymentsData({ private_key: "", ipn_secret: "", merchant_id: "" });

      setSuccess("Настройки успешно добавлены");
    } catch (err) {
      console.error("Ошибка при добавлении настроек платежей:", err);
      setError(err.message || "Ошибка при добавлении настроек платежей");
    } finally {
      setAdding(false);
    }
  };

  // ---- 3) Удаление ----
  const deleteConfig = async (id) => {
    if (!confirm("Вы уверены, что хотите удалить эти настройки?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/payment/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Ошибка при удалении настроек платежей");
      }
      setConfigs(configs.filter(config => config.id !== id));
      setSuccess("Настройки успешно удалены.");
    } catch (err) {
      console.error("Ошибка при удалении настроек платежей:", err);
      setError(err.message || "Ошибка при удалении настроек платежей");
    }
  };

  // ============ НОВОЕ: Редактирование (модалка) ============
  const startEdit = (cfg) => {
    // cfg - объект PaymentConfig: {id, provider_name, api_key, extra_config...}
    // Парсим extra_config, чтобы разнести поля
    let parsedExtra = {};
    try {
      parsedExtra = JSON.parse(cfg.extra_config || "{}");
    } catch (e) {
      parsedExtra = {};
    }

    // Формируем объект editConfig, где распарсены поля
    const editObj = {
      id: cfg.id,
      provider_name: cfg.provider_name,
      api_key: cfg.api_key,
      // Для robokassa
      robokassa: {
        password1: parsedExtra.password1 || "",
        password2: parsedExtra.password2 || "",
      },
      // Для coinpayments
      coinpayments: {
        private_key: parsedExtra.private_key || "",
        ipn_secret: parsedExtra.ipn_secret || "",
        merchant_id: parsedExtra.merchant_id || "",
      },
    };

    setEditConfig(editObj);
    // Открываем модалку
    const modal = document.getElementById("edit_modal");
    modal?.showModal();
  };

  const closeEditModal = () => {
    const modal = document.getElementById("edit_modal");
    modal?.close();
    setEditConfig(null);
  };

  const saveEdit = async () => {
    if (!editConfig?.api_key.trim()) {
      setError("API Key не может быть пустым");
      return;
    }
    setError("");
    setSuccess("");

    // Собираем extra_config в JSON
    let newExtra = {};
    if (editConfig.provider_name === "robokassa") {
      newExtra = {
        password1: editConfig.robokassa.password1,
        password2: editConfig.robokassa.password2,
      };
    } else if (editConfig.provider_name === "coinpayments") {
      newExtra = {
        private_key: editConfig.coinpayments.private_key,
        ipn_secret: editConfig.coinpayments.ipn_secret,
        merchant_id: editConfig.coinpayments.merchant_id,
      };
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/payment/${editConfig.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          api_key: editConfig.api_key,
          extra_config: JSON.stringify(newExtra),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Ошибка при редактировании настроек");
      }

      const updated = await res.json();
      // Обновляем запись в configs
      setConfigs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSuccess("Изменения сохранены");
      closeEditModal();
    } catch (err) {
      console.error("Ошибка при редактировании настроек:", err);
      setError(err.message || "Ошибка при редактировании настроек");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Настройки платежей</h1>

      {error && (
        <div className="alert alert-error my-4">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success my-4">
          <span>{success}</span>
        </div>
      )}

      {/* Блок добавления новой настройки */}
      <div className="card bg-base-100 shadow-xl p-4 mb-6">
        <h2 className="text-xl font-medium mb-4">Добавить новый метод оплаты</h2>
        <div className="mb-4">
          <label className="block text-gray-700 mb-1 font-semibold">Платёжный провайдер</label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="select select-bordered w-full"
          >
            <option value="robokassa">Robokassa</option>
            <option value="coinpayments">CoinPayments (Crypto)</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-1 font-semibold">
            API Key / MerchantLogin
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Пример: myLogin или PUBKEY..."
            className="input input-bordered w-full"
          />
        </div>

        {/* Robokassa поля */}
        {selectedProvider === "robokassa" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Password1
              </label>
              <input
                type="text"
                value={robokassaPasswords.password1}
                onChange={(e) =>
                  setRobokassaPasswords((prev) => ({ ...prev, password1: e.target.value }))
                }
                className="input input-bordered w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Password2
              </label>
              <input
                type="text"
                value={robokassaPasswords.password2}
                onChange={(e) =>
                  setRobokassaPasswords((prev) => ({ ...prev, password2: e.target.value }))
                }
                className="input input-bordered w-full"
              />
            </div>
          </div>
        )}

        {/* CoinPayments поля */}
        {selectedProvider === "coinpayments" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">Private Key</label>
              <input
                type="text"
                value={coinPaymentsData.private_key}
                onChange={(e) =>
                  setCoinPaymentsData((prev) => ({ ...prev, private_key: e.target.value }))
                }
                className="input input-bordered w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">IPN Secret</label>
              <input
                type="text"
                value={coinPaymentsData.ipn_secret}
                onChange={(e) =>
                  setCoinPaymentsData((prev) => ({ ...prev, ipn_secret: e.target.value }))
                }
                className="input input-bordered w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">Merchant ID</label>
              <input
                type="text"
                value={coinPaymentsData.merchant_id}
                onChange={(e) =>
                  setCoinPaymentsData((prev) => ({ ...prev, merchant_id: e.target.value }))
                }
                className="input input-bordered w-full"
              />
            </div>
          </div>
        )}

        <button
          onClick={addConfig}
          disabled={adding}
          className="btn btn-primary mt-4"
        >
          {adding ? "Добавление..." : "Добавить"}
        </button>
      </div>

      {/* Список настроек */}
      {loading ? (
        <div className="text-gray-500">Загрузка настроек платежей...</div>
      ) : (
        <div className="overflow-x-auto bg-base-100 shadow rounded">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Провайдер</th>
                <th>API ключ / Логин</th>
                <th>Extra Config</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {configs.length > 0 ? (
                configs.map((cfg) => (
                  <tr key={cfg.id} className="text-center">
                    <td>{cfg.provider_name}</td>
                    <td>{cfg.api_key}</td>
                    <td>
                      <pre className="text-xs text-left">
                        {cfg.extra_config || "{}"}
                      </pre>
                    </td>
                    <td>
                      <button
                        onClick={() => startEdit(cfg)}
                        className="btn btn-xs btn-secondary mr-2"
                      >
                        Ред.
                      </button>
                      <button
                        onClick={() => deleteConfig(cfg.id)}
                        className="btn btn-xs btn-error"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-4 text-gray-500">
                    Настройки не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модалка для редактирования (НОВОЕ) */}
      <dialog id="edit_modal" className="modal">
        <form method="dialog" className="modal-box w-11/12 max-w-2xl">
          <h3 className="font-bold text-lg mb-4">Редактировать метод оплаты</h3>

          {editConfig && (
            <>
              <div className="mb-4">
                <label className="label">
                  <span className="label-text font-semibold">Провайдер</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editConfig.provider_name}
                  disabled
                  readOnly
                />
              </div>
              <div className="mb-4">
                <label className="label">
                  <span className="label-text font-semibold">API Key</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editConfig.api_key}
                  onChange={(e) =>
                    setEditConfig({ ...editConfig, api_key: e.target.value })
                  }
                />
              </div>

              {/* Если Robokassa */}
              {editConfig.provider_name === "robokassa" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Password1</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={editConfig.robokassa.password1}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          robokassa: {
                            ...editConfig.robokassa,
                            password1: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Password2</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={editConfig.robokassa.password2}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          robokassa: {
                            ...editConfig.robokassa,
                            password2: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Если CoinPayments */}
              {editConfig.provider_name === "coinpayments" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Private Key</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={editConfig.coinpayments.private_key}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          coinpayments: {
                            ...editConfig.coinpayments,
                            private_key: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">IPN Secret</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={editConfig.coinpayments.ipn_secret}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          coinpayments: {
                            ...editConfig.coinpayments,
                            ipn_secret: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Merchant ID</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={editConfig.coinpayments.merchant_id}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          coinpayments: {
                            ...editConfig.coinpayments,
                            merchant_id: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="modal-action mt-4">
            <button type="button" className="btn btn-success" onClick={saveEdit}>
              Сохранить
            </button>
            <button type="button" className="btn" onClick={closeEditModal}>
              Отмена
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
