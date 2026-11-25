import { useCallback, useEffect, useState } from "react";
import { FolderPlus, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { getCategories } from "../../products/api/productsApi";
import AdminModal from "./AdminModal";
import { createCategory, updateCategory, deleteCategory } from "../api/adminApi";
import { getCategoryParentId, getParentCategories, isCategoryGroup } from "../../products/utils/categoryHierarchy";
import "../styles/categoriesPanel.css";

const emptyForm = { name: "", parentId: "", isActive: "false" };

export default function CategoriesPanel() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [loadError, setLoadError] = useState("");

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState(emptyForm);
    const closeCreateForm = useCallback(() => setShowCreateForm(false), []);

    const [showUpdateForm, setShowUpdateForm] = useState(false);
    const [updateForm, setUpdateForm] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getCategories();
            setCategories(data);
            setLoadError("");
        } catch (error) {
            console.error("Lỗi khi tải danh sách category:", error);
            setLoadError("Không thể tải danh sách category. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(load, 0);
        return () => clearTimeout(timeout);
    }, [load]);

    const filteredCategories = categories.filter((category) =>
        `${category.name || ""} ${category.parent?.name || ""}`.toLowerCase().includes(search.trim().toLowerCase())
    );

    const handleCreate = async (e) => {
        e.preventDefault();

        const category = {
            name: createForm.name,
            parentId: createForm.parentId,
            isActive: createForm.isActive === "true",
        };

        try {
            await createCategory(category);
            setShowCreateForm(false);
            setCreateForm(emptyForm);
            await load();
        } catch (error) {
            console.error("Lỗi khi tạo danh mục:", error);
            setLoadError(error.response?.data?.message || "Không thể tạo danh mục. Vui lòng kiểm tra danh mục cha.");
        }
    };

    const startEdit = (category) => {
        setUpdateForm({
            id: category._id,
            name: category.name,
            parentId: getCategoryParentId(category) || "",
            isActive: String(category.isActive),
        });
        setShowUpdateForm(true);
    };

    const handleUpdate = async () => {
        const category = {
            id: updateForm.id,
            name: updateForm.name,
            parentId: updateForm.parentId,
            isActive: updateForm.isActive === "true",
        };

        try {
            await updateCategory(category);
            setShowUpdateForm(false);
            await load();
        } catch (error) {
            console.error("Lỗi khi cập nhật danh mục:", error);
            setLoadError(error.response?.data?.message || "Không thể cập nhật danh mục. Vui lòng kiểm tra danh mục cha.");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Bạn có muốn xóa category này?")) return;
        try {
            await deleteCategory(id);
            await load();
        } catch (error) {
            console.error("Lỗi khi xóa danh mục:", error);
            setLoadError(error.response?.data?.message || "Không thể xóa danh mục.");
        }
    };

    return (
        <div className="categories-container categories-panel-container">
            <div className="categories-panel-header">
                <div>
                    <h1>Quản lý Category</h1>
                    <p>Tổng số: {categories.length} danh mục</p>
                </div>
                <div className="categories-header-actions">
                    <button
                        type="button"
                        className="btn-panel-refresh"
                        onClick={load}
                        title="Tải lại danh sách"
                        disabled={loading}
                    >
                        <RefreshCw size={15} className={loading ? "spin" : ""} />
                    </button>
                    <button type="button" className="btn-add-category" onClick={() => setShowCreateForm(true)}>
                        <FolderPlus size={15} />
                        Thêm category
                    </button>
                </div>
            </div>

            {loadError && <div className="categories-panel-alert error" role="alert">{loadError}</div>}

            <div className="categories-filters-bar">
                <div className="categories-search-wrapper">
                    <Search size={15} className="search-icon" />
                    <input
                        type="search"
                        placeholder="Tìm kiếm category..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>
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
                                <label htmlFor="create-category-parent">Danh mục cha</label>
                                <select
                                    id="create-category-parent"
                                    value={createForm.parentId}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, parentId: e.target.value }))}
                                    required
                                >
                                    <option value="">-- Chọn danh mục cha --</option>
                                    {getParentCategories(categories).map((category) => (
                                        <option key={category._id} value={category._id}>{category.name}</option>
                                    ))}
                                </select>
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

            <div className="categories-table-wrapper">
                <table className="categories-table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Danh mục cha</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && categories.length === 0 ? (
                            <tr><td colSpan={4} className="categories-table-empty">Đang tải dữ liệu...</td></tr>
                        ) : filteredCategories.length === 0 ? (
                            <tr><td colSpan={4} className="categories-table-empty">Không tìm thấy category phù hợp.</td></tr>
                        ) : filteredCategories.map((category) => (
                            <tr key={category._id}>
                                <td className={`categories-table-name${getCategoryParentId(category) ? " child" : ""}`}>
                                    {getCategoryParentId(category) ? `↳ ${category.name}` : category.name}
                                </td>
                                <td>{isCategoryGroup(category) ? "NHÓM CHA CỐ ĐỊNH" : category.parent?.name || "—"}</td>
                                <td>
                                    <span className={`category-status-badge ${category.isActive ? "active" : "inactive"}`}>
                                        {category.isActive ? "Đang hiện" : "Đang ẩn"}
                                    </span>
                                </td>
                                <td>
                                    <div className="categories-table-actions">
                                        <button
                                            type="button"
                                            className="btn-category-edit"
                                            onClick={() => startEdit(category)}
                                            disabled={isCategoryGroup(category)}
                                            title={isCategoryGroup(category) ? "Tên nhóm cha hệ thống được giữ cố định" : undefined}
                                        >
                                            <Pencil size={13} /> Sửa
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-category-delete"
                                            onClick={() => handleDelete(category._id)}
                                            disabled={isCategoryGroup(category)}
                                            title={isCategoryGroup(category) ? "Nhóm cha hệ thống không thể xóa" : undefined}
                                        >
                                            <Trash2 size={13} /> Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showUpdateForm && updateForm && (
                <AdminModal
                    title="Sửa category"
                    titleId="update-category-modal-title"
                    eyebrow="[ EDIT CATEGORY ]"
                    onClose={() => setShowUpdateForm(false)}
                >
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleUpdate();
                        }}
                        className="admin-modal-form"
                    >
                        <div className="admin-modal-form-grid">
                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="update-category-name">Tên category</label>
                                <input
                                    id="update-category-name"
                                    value={updateForm.name}
                                    onChange={(e) => setUpdateForm((f) => ({ ...f, name: e.target.value }))}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="update-category-parent">Danh mục cha</label>
                                <select
                                    id="update-category-parent"
                                    value={updateForm.parentId}
                                    onChange={(e) => setUpdateForm((f) => ({ ...f, parentId: e.target.value }))}
                                    required
                                >
                                    <option value="">-- Chọn danh mục cha --</option>
                                    {getParentCategories(categories, updateForm.id).map((category) => (
                                        <option key={category._id} value={category._id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="update-category-status">Trạng thái</label>
                                <select
                                    id="update-category-status"
                                    value={updateForm.isActive}
                                    onChange={(e) => setUpdateForm((f) => ({ ...f, isActive: e.target.value }))}
                                >
                                    <option value="false">Ẩn</option>
                                    <option value="true">Hiện</option>
                                </select>
                            </div>
                        </div>
                        <div className="admin-modal-actions">
                            <button type="button" className="admin-modal-cancel" onClick={() => setShowUpdateForm(false)}>Hủy</button>
                            <button type="submit" className="admin-modal-submit">Cập nhật</button>
                        </div>
                    </form>
                </AdminModal>
            )}
        </div>
    );
}
