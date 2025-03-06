// admin-panel/pages/categorymanager.js
import { useState, useEffect } from "react";

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  // Поля для создания новой категории
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  // Редактируемая категория (при нажатии "Ред.")
  const [editCat, setEditCat] = useState(null);

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // Загрузка списка категорий
  useEffect(() => {
    fetchCategories();
  }, [API_URL]);

  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/categories/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Не удалось загрузить категории");
      }

      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("Ошибка загрузки категорий:", err);
      setError(err.message || "Ошибка загрузки категорий");
    } finally {
      setLoading(false);
    }
  };

  // Создание новой категории
  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      setError("Название категории не может быть пустым");
      return;
    }

    setAdding(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/categories/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCategoryName,
          parent_id: newParentId ? parseInt(newParentId, 10) : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || "Ошибка при добавлении категории");
      }

      const newCat = await res.json();
      setCategories((prev) => [...prev, newCat]);
      setNewCategoryName("");
      setNewParentId("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка при добавлении категории");
    } finally {
      setAdding(false);
    }
  };

  // Удаление категории
  const deleteCategory = async (id) => {
    if (!confirm("Вы уверены, что хотите удалить эту категорию?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || "Ошибка при удалении категории");
      }

      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка при удалении категории");
    }
  };

  // Начать редактирование категории (открыть модалку)
  const startEdit = (cat) => {
    setEditCat({ ...cat }); // копия данных, чтобы редактировать
    const modal = document.getElementById("edit_modal");
    modal?.showModal();
  };

  // Сохранить изменения категории (PUT)
  const saveEdit = async () => {
    if (!editCat?.name.trim()) {
      setError("Название категории не может быть пустым");
      return;
    }
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/categories/${editCat.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editCat.name,
          parent_id: editCat.parent_id || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || "Ошибка при редактировании категории");
      }

      const updatedCat = await res.json();
      // Обновляем в списке
      setCategories((prev) =>
        prev.map((c) => (c.id === updatedCat.id ? updatedCat : c))
      );
      closeEditModal();
    } catch (err) {
      console.error("Ошибка при редактировании категории:", err);
      setError(err.message || "Ошибка при редактировании категории");
    }
  };

  // Закрыть модалку
  const closeEditModal = () => {
    const modal = document.getElementById("edit_modal");
    modal?.close();
    setEditCat(null);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Менеджер категорий</h1>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Карточка для добавления категории */}
      <div className="card bg-base-100 shadow-xl p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">Добавить новую категорию</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              <span className="label-text">Название категории</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Например: 'Книги'"
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">Parent ID (опционально)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              placeholder="Число или пусто"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={addCategory}
            disabled={adding}
            className="btn btn-primary"
          >
            {adding ? "Добавление..." : "Добавить"}
          </button>
        </div>
      </div>

      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Parent ID</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.id}</td>
                  <td>{cat.name}</td>
                  <td>{cat.parent_id || ""}</td>
                  <td>
                    <button
                      onClick={() => startEdit(cat)}
                      className="btn btn-xs btn-secondary mr-2"
                    >
                      Ред.
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="btn btn-xs btn-error"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}

              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-4">
                    Категории не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модалка (dialog) для редактирования */}
      <dialog id="edit_modal" className="modal">
        <form method="dialog" className="modal-box w-11/12 max-w-xl">
          <h3 className="text-lg font-bold mb-4">Редактировать категорию</h3>

          {editCat && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="label-text">Название</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editCat.name}
                  onChange={(e) =>
                    setEditCat({ ...editCat, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Parent ID</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={editCat.parent_id || ""}
                  onChange={(e) =>
                    setEditCat({
                      ...editCat,
                      parent_id: e.target.value
                        ? parseInt(e.target.value, 10)
                        : null,
                    })
                  }
                />
              </div>
            </div>
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
