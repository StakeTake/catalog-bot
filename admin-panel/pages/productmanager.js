// admin-panel/pages/productmanager.js
import { useState, useEffect } from "react";

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    title: "",
    description: "",
    price: 0,
    file_url: "",
    file_size: 0,
    category_id: ""
  });
  const [editProduct, setEditProduct] = useState(null); // хранит текущий товар для редактирования
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // Функция для загрузки списка продуктов
  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/products/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Не удалось загрузить продукты");
      }
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Ошибка загрузки продуктов:", err);
      setError(err.message || "Ошибка загрузки продуктов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [API_URL]);

  // Функция для добавления нового продукта
  const addProduct = async () => {
    if (!newProduct.title.trim()) {
      setError("Название продукта не может быть пустым");
      return;
    }
    setAdding(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/products/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newProduct)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.detail || "Ошибка при добавлении продукта");
      }
      const addedProduct = await res.json();
      setProducts((prev) => [...prev, addedProduct]);
      // Очищаем поля ввода
      setNewProduct({
        title: "",
        description: "",
        price: 0,
        file_url: "",
        file_size: 0,
        category_id: ""
      });
    } catch (err) {
      console.error("Ошибка при добавлении продукта:", err);
      setError(err.message || "Ошибка при добавлении продукта");
    } finally {
      setAdding(false);
    }
  };

  // Функция для удаления продукта
  const deleteProduct = async (id) => {
    if (!confirm("Вы уверены, что хотите удалить этот продукт?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.detail || "Ошибка при удалении продукта");
      }
      setProducts((prev) => prev.filter((product) => product.id !== id));
    } catch (err) {
      console.error("Ошибка при удалении продукта:", err);
      setError(err.message || "Ошибка при удалении продукта");
    }
  };

  // Открываем модалку для редактирования
  const startEdit = (prod) => {
    setEditProduct({ ...prod }); // копируем поля
    // Открываем диалог (daisyUI)
    const modal = document.getElementById("edit_modal");
    modal?.showModal();
  };

  // Сохраняем изменения
  const saveEdit = async () => {
    if (!editProduct?.title.trim()) {
      setError("Название продукта не может быть пустым");
      return;
    }
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/products/${editProduct.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editProduct.title,
          description: editProduct.description,
          price: editProduct.price,
          file_url: editProduct.file_url,
          file_size: editProduct.file_size,
          category_id: editProduct.category_id
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.detail || "Ошибка при редактировании продукта");
      }
      const updatedProd = await res.json();
      // Обновим список products
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProd.id ? updatedProd : p))
      );
      // Закрываем модалку
      closeEditModal();
    } catch (err) {
      console.error("Ошибка при редактировании продукта:", err);
      setError(err.message || "Ошибка при редактировании продукта");
    }
  };

  const closeEditModal = () => {
    const modal = document.getElementById("edit_modal");
    modal?.close();
    setEditProduct(null);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Менеджер продуктов</h1>

      {error && (
        <div className="alert alert-error shadow-lg mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Блок добавления нового продукта */}
      <div className="card bg-base-100 shadow-xl p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">Добавить продукт</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div>
            <label className="label">
              <span className="label-text">Название</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={newProduct.title}
              onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
            />
          </div>

          {/* Price */}
          <div>
            <label className="label">
              <span className="label-text">Цена</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">
              <span className="label-text">Описание</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            ></textarea>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Ссылка на файл</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={newProduct.file_url}
              onChange={(e) => setNewProduct({ ...newProduct, file_url: e.target.value })}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Размер файла (MB)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={newProduct.file_size}
              onChange={(e) => setNewProduct({ ...newProduct, file_size: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Категория (ID)</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={newProduct.category_id}
              onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={addProduct}
            disabled={adding}
            className="btn btn-primary"
          >
            {adding ? "Добавление..." : "Добавить"}
          </button>
        </div>
      </div>

      {/* Таблица продуктов */}
      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Название</th>
                <th>Цена</th>
                <th>Описание</th>
                <th>Файл</th>
                <th>Размер (MB)</th>
                <th>Категория</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.price}</td>
                  <td>{p.description}</td>
                  <td>
                    <a
                      href={p.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary"
                    >
                      Ссылка
                    </a>
                  </td>
                  <td>{p.file_size}</td>
                  <td>{p.category_id}</td>
                  <td>
                    <button
                      className="btn btn-xs btn-secondary mr-2"
                      onClick={() => startEdit(p)}
                    >
                      Ред.
                    </button>
                    <button
                      className="btn btn-xs btn-error"
                      onClick={() => deleteProduct(p.id)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    Продукты не найдены.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модалка редактирования (daisyUI) */}
      <dialog id="edit_modal" className="modal">
        <form method="dialog" className="modal-box w-11/12 max-w-2xl">
          <h3 className="font-bold text-lg mb-4">Редактировать товар</h3>

          {editProduct && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label className="label">
                  <span className="label-text">Название</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editProduct.title}
                  onChange={(e) =>
                    setEditProduct({ ...editProduct, title: e.target.value })
                  }
                />
              </div>
              {/* Price */}
              <div>
                <label className="label">
                  <span className="label-text">Цена</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={editProduct.price}
                  onChange={(e) =>
                    setEditProduct({ ...editProduct, price: parseFloat(e.target.value) })
                  }
                />
              </div>
              {/* Description */}
              <div className="md:col-span-2">
                <label className="label">
                  <span className="label-text">Описание</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={editProduct.description}
                  onChange={(e) =>
                    setEditProduct({ ...editProduct, description: e.target.value })
                  }
                ></textarea>
              </div>
              {/* File url */}
              <div>
                <label className="label">
                  <span className="label-text">Ссылка на файл</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editProduct.file_url}
                  onChange={(e) =>
                    setEditProduct({ ...editProduct, file_url: e.target.value })
                  }
                />
              </div>
              {/* file_size */}
              <div>
                <label className="label">
                  <span className="label-text">Размер файла</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={editProduct.file_size}
                  onChange={(e) =>
                    setEditProduct({ ...editProduct, file_size: parseFloat(e.target.value) })
                  }
                />
              </div>
              {/* category_id */}
              <div>
                <label className="label">
                  <span className="label-text">Категория (ID)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editProduct.category_id}
                  onChange={(e) =>
                    setEditProduct({ ...editProduct, category_id: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <div className="modal-action mt-4">
            <button
              type="button"
              className="btn btn-success"
              onClick={saveEdit}
            >
              Сохранить
            </button>
            <button
              type="button"
              className="btn"
              onClick={closeEditModal}
            >
              Отмена
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
