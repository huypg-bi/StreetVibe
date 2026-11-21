import { useCallback, useEffect, useState } from "react";
import { getCategories } from "../../products/api/productsApi";
import AdminModal from "./AdminModal";
import { createCategory, updateCategory, deleteCategory } from "../api/adminApi";

const emptyForm = { name: "", description: "", isActive: "false" };

export default function CategoriesPanel() {
    const [categories, setCategories] = useState([]);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState(emptyForm);
    const closeCreateForm = useCallback(() => setShowCreateForm(false), []);

    const [showUpdateForm, setShowUpdateForm] = useState(false);
    const [updateForm, setUpdateForm] = useState(null);

    const load = useCallback(async () => {
        const data = await getCategories();
        setCategories(data);
    }, []);

    useEffect(() => {
        // load() is an async refetch also reused by the create/update/delete handlers below;
        // its setState calls run after the await, not synchronously in this effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load().catch((error) => console.error(error));
    }, [load]);

    const handleCreate = async (e) => {
        e.preventDefault();

        const category = {
            name: createForm.name,
            description: createForm.description,
            isActive: createForm.isActive === "true",
        };

        await createCategory(category);
        alert("Tạo category thành công!");
        setShowCreateForm(false);
        setCreateForm(emptyForm);
        load();
    };

    const startEdit = (category) => {
        setUpdateForm({
            id: category._id,
            name: category.name,
            description: category.description,
            isActive: String(category.isActive),
        });
        setShowUpdateForm(true);
    };

    const handleUpdate = async () => {
        const category = {
            id: updateForm.id,
            name: updateForm.name,
            description: updateForm.description,
            isActive: updateForm.isActive === "true",
        };

        await updateCategory(category);
        alert("Cập nhật thành công!");
        setShowUpdateForm(false);
        load();
    };

    const handleDelete = async (id) => {
        if (!confirm("Bạn có muốn xóa category này?")) return;
        await deleteCategory(id);
        load();
    };

    return (
        <div className="categories-container">
            <div className="admin-management-header">
                <div>
                    <span className="admin-management-eyebrow">[ DROP TAXONOMY ]</span>
                    <h1>Quản lý Category</h1>
                </div>
                <button
                    type="button"
                    className="admin-add-button"
                    onClick={() => setShowCreateForm(true)}
                >
                    + Thêm category
                </button>
            </div>

            {showCreateForm && (
                <AdminModal
                    title="Thêm category"
                    titleId="create-category-modal-title"
                    eyebrow="[ CATEGORY SETUP ]"
                    onClose={closeCreateForm}
                >
                    <form onSubmit={handleCreate} className="admin-modal-form">
                        <div className="admin-modal-form-grid">
                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="create-category-name">Tên category</label>
                                <input
                                    id="create-category-name"
                                    type="text"
                                    placeholder="Tên category"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="create-category-description">Mô tả</label>
                                <textarea
                                    id="create-category-description"
                                    placeholder="Mô tả category"
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                                    rows="3"
                                />
                            </div>

                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="create-category-status">Trạng thái</label>
                                <select
                                    id="create-category-status"
                                    value={createForm.isActive}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, isActive: e.target.value }))}
                                >
                                    <option value="false">Ẩn</option>
                                    <option value="true">Hiện</option>
                                </select>
                            </div>
                        </div>

                        <div className="admin-modal-actions">
                            <button type="button" className="admin-modal-cancel" onClick={closeCreateForm}>Hủy</button>
                            <button type="submit" className="admin-modal-submit">Lưu category</button>
                        </div>
                    </form>
                </AdminModal>
            )}

            <table>
                <tbody>
                    <tr>
                        <th>Tên</th>
                        <th>Mô tả</th>
                        <th>Trạng thái</th>
                        <th>Hành Động</th>
                    </tr>

                    {categories.map((category) => (
                        <tr key={category._id}>
                            <td>{category.name}</td>
                            <td>{category.description}</td>
                            <td>{category.isActive ? "Hiện" : "Ẩn"}</td>
                            <td>
                                <button type="button" onClick={() => startEdit(category)}>Sửa</button>
                                <button type="button" onClick={() => handleDelete(category._id)}>Xóa</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Form update */}
            {showUpdateForm && updateForm && (
                <div id="updateForm">
                    <input
                        type="text"
                        placeholder="Tên category"
                        value={updateForm.name}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Mô tả"
                        value={updateForm.description}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, description: e.target.value }))}
                    />
                    <select
                        value={updateForm.isActive}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, isActive: e.target.value }))}
                    >
                        <option value="false">Ẩn</option>
                        <option value="true">Hiện</option>
                    </select>
                    <div className="form-actions">
                        <button type="button" className="btn-save" onClick={handleUpdate}>Cập nhật</button>
                        <button type="button" className="btn-cancel" onClick={() => setShowUpdateForm(false)}>Hủy</button>
                    </div>
                </div>
            )}
        </div>
    );
}
