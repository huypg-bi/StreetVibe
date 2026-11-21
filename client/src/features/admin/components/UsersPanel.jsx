import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import {
    getUsers,
    updateUserRole,
    deleteUser,
    createUser,
} from "../api/adminApi";
import {
    Search,
    UserPlus,
    Shield,
    Trash2,
    RefreshCw,
    X,
    UserCheck,
} from "lucide-react";
import "../styles/usersPanel.css";

const defaultNewUser = {
    name: "",
    email: "",
    password: "",
    role: "customer",
};

export default function UsersPanel() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [alert, setAlert] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(defaultNewUser);
    const [submitting, setSubmitting] = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getUsers({
                search,
                role: roleFilter,
                limit: 50,
            });
            setUsers(data?.users || []);
        } catch (err) {
            console.error("Lỗi khi tải danh sách người dùng:", err);
            setAlert({
                type: "error",
                message: "Không thể tải danh sách người dùng. Vui lòng thử lại!",
            });
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadUsers();
        }, 300);
        return () => clearTimeout(timeout);
    }, [loadUsers]);

    const handleToggleRole = async (targetUser) => {
        if (currentUser?.id === targetUser.id) {
            setAlert({
                type: "error",
                message: "Bạn không thể tự thay đổi vai trò của chính mình!",
            });
            return;
        }

        const newRole = targetUser.role === "admin" ? "customer" : "admin";
        const confirmMsg = `Bạn có chắc chắn muốn đổi quyền của "${targetUser.name}" sang [${newRole.toUpperCase()}] không?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            await updateUserRole(targetUser.id, newRole);
            setAlert({
                type: "success",
                message: `Đã đổi quyền của ${targetUser.name} sang ${newRole}!`,
            });
            loadUsers();
        } catch (err) {
            const errMsg = err.response?.data?.message || "Lỗi khi cập nhật quyền";
            setAlert({ type: "error", message: errMsg });
        }
    };

    const handleDeleteUser = async (targetUser) => {
        if (currentUser?.id === targetUser.id) {
            setAlert({
                type: "error",
                message: "Bạn không thể tự xóa tài khoản của chính mình!",
            });
            return;
        }

        if (!window.confirm(`Bạn có chắc muốn xóa tài khoản "${targetUser.name}" (${targetUser.email})? Hành động này không thể hoàn tác.`)) {
            return;
        }

        try {
            await deleteUser(targetUser.id);
            setAlert({
                type: "success",
                message: `Đã xóa tài khoản ${targetUser.name} thành công!`,
            });
            loadUsers();
        } catch (err) {
            const errMsg = err.response?.data?.message || "Lỗi khi xóa người dùng";
            setAlert({ type: "error", message: errMsg });
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password) {
            setAlert({ type: "error", message: "Vui lòng nhập đầy đủ thông tin!" });
            return;
        }

        setSubmitting(true);
        try {
            await createUser(formData);
            setAlert({
                type: "success",
                message: `Tạo tài khoản "${formData.name}" thành công!`,
            });
            setShowModal(false);
            setFormData(defaultNewUser);
            loadUsers();
        } catch (err) {
            const errMsg = err.response?.data?.message || "Lỗi khi tạo người dùng";
            setAlert({ type: "error", message: errMsg });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="users-panel-container">
            {/* Header */}
            <div className="users-panel-header">
                <div>
                    <h1>Quản lý người dùng</h1>
                    <p style={{ margin: "4px 0 0", color: "#666", fontSize: "12px" }}>
                        Tổng số: {users.length} tài khoản trong hệ thống
                    </p>
                </div>

                <div className="header-actions">
                    <button
                        type="button"
                        className="btn-toggle-role"
                        onClick={loadUsers}
                        title="Tải lại danh sách"
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? "spin" : ""} />
                    </button>
                    <button
                        type="button"
                        className="btn-add-user"
                        onClick={() => setShowModal(true)}
                    >
                        <UserPlus size={15} />
                        Thêm người dùng
                    </button>
                </div>
            </div>

            {/* Notification alert */}
            {alert && (
                <div className={`alert-box ${alert.type}`}>
                    <span>{alert.message}</span>
                    <button
                        type="button"
                        onClick={() => setAlert(null)}
                        style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Filter Toolbar */}
            <div className="users-filters-bar">
                <div className="users-search-wrapper">
                    <Search size={15} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <select
                    className="users-role-select"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                >
                    <option value="">Tất cả vai trò</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                    <option value="customer">Khách hàng (Customer)</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="users-table-wrapper">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Người dùng</th>
                            <th>Vai trò</th>
                            <th>Ngày tham gia</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && users.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                                    Đang tải dữ liệu...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                                    Không tìm thấy người dùng nào phù hợp.
                                </td>
                            </tr>
                        ) : (
                            users.map((item) => {
                                const isSelf = currentUser?.id === item.id;
                                const initial = item.name ? item.name.charAt(0).toUpperCase() : "U";
                                const formattedDate = item.created_at
                                    ? new Date(item.created_at).toLocaleDateString("vi-VN", {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                      })
                                    : "N/A";

                                return (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="user-info-cell">
                                                <div className="user-avatar-circle">{initial}</div>
                                                <div>
                                                    <div className="user-name-title">
                                                        {item.name} {isSelf && <span style={{ fontSize: "10px", color: "#888" }}>(Bạn)</span>}
                                                    </div>
                                                    <div className="user-email-subtitle">{item.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`role-badge ${item.role}`}>
                                                {item.role === "admin" ? "Admin" : "Customer"}
                                            </span>
                                        </td>
                                        <td style={{ color: "#666", fontSize: "11px" }}>
                                            {formattedDate}
                                        </td>
                                        <td>
                                            <div className="users-action-btns">
                                                <button
                                                    type="button"
                                                    className="btn-toggle-role"
                                                    onClick={() => handleToggleRole(item)}
                                                    disabled={isSelf}
                                                    title={item.role === "admin" ? "Hạ quyền xuống Customer" : "Nâng quyền lên Admin"}
                                                >
                                                    {item.role === "admin" ? (
                                                        <>
                                                            <UserCheck size={12} style={{ marginRight: "4px" }} />
                                                            Hạ Customer
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Shield size={12} style={{ marginRight: "4px" }} />
                                                            Lên Admin
                                                        </>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn-delete-user"
                                                    onClick={() => handleDeleteUser(item)}
                                                    disabled={isSelf}
                                                    title={isSelf ? "Không thể xóa chính mình" : "Xóa người dùng"}
                                                >
                                                    <Trash2 size={12} style={{ marginRight: "4px" }} />
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Create User */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Thêm người dùng mới</h2>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setShowModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="modal-form">
                            <div className="form-field">
                                <label>Họ và tên</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nguyễn Văn A"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                />
                            </div>

                            <div className="form-field">
                                <label>Email</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="user@example.com"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                />
                            </div>

                            <div className="form-field">
                                <label>Mật khẩu</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Ít nhất 6 ký tự"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                />
                            </div>

                            <div className="form-field">
                                <label>Vai trò</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) =>
                                        setFormData({ ...formData, role: e.target.value })
                                    }
                                >
                                    <option value="customer">Khách hàng (Customer)</option>
                                    <option value="admin">Quản trị viên (Admin)</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => setShowModal(false)}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal-submit"
                                    disabled={submitting}
                                >
                                    {submitting ? "Đang tạo..." : "Tạo tài khoản"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
