import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import {
    getUsers,
    updateUserRole,
    approveSupplierRequest,
    deleteUser,
    createUser,
    updateCustomerStatus,
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
import Pagination from "../../../shared/components/Pagination";
import { PAGE_SIZE, getTotalPages } from "../../../shared/utils/pagination";
import "../styles/usersPanel.css";
import { toast } from "../../../shared/utils/toast";

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
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

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
                page,
                limit: PAGE_SIZE,
            });
            const nextTotal = data?.pagination?.total ?? 0;
            // Trang hiện tại có thể trống sau khi xóa người dùng cuối cùng của trang
            if (page > getTotalPages(nextTotal)) {
                setPage(getTotalPages(nextTotal));
                return;
            }
            setUsers(data?.users || []);
            setTotal(nextTotal);
        } catch (err) {
            console.error("Lỗi khi tải danh sách người dùng:", err);
            toast.error("Không thể tải danh sách người dùng. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter, page]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadUsers();
        }, 300);
        return () => clearTimeout(timeout);
    }, [loadUsers]);

    const handleToggleRole = async (targetUser) => {
        if (currentUser?.id === targetUser.id) {
            toast.error("Bạn không thể tự thay đổi vai trò của chính mình!");
            return;
        }

        const newRole = targetUser.role === "admin"
            ? "customer"
            : targetUser.role === "supplier"
                ? "customer"
                : "admin";
        const confirmMsg = `Bạn có chắc chắn muốn đổi quyền của "${targetUser.name}" sang [${newRole.toUpperCase()}] không?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            await updateUserRole(targetUser.id, newRole);
            toast.success(`Đã đổi quyền của ${targetUser.name} sang ${newRole}!`);
            loadUsers();
        } catch (err) {
            const errMsg = err.response?.data?.message || "Lỗi khi cập nhật quyền";
            toast.error(errMsg);
        }
    };

    const handleApproveSupplier = async (targetUser) => {
        if (!window.confirm(`Duyệt yêu cầu Supplier của "${targetUser.name}"?`)) return;

        try {
            await approveSupplierRequest(targetUser.id);
            toast.success(`Đã duyệt ${targetUser.name} thành Supplier. Quyền mới có hiệu lực sau lần đăng nhập tiếp theo.`);
            loadUsers();
        } catch (err) {
            const errMsg = err.response?.data?.message || "Lỗi khi duyệt yêu cầu Supplier";
            toast.error(errMsg);
        }
    };

    const handleDeleteUser = async (targetUser) => {
        if (currentUser?.id === targetUser.id) {
            toast.error("Bạn không thể tự xóa tài khoản của chính mình!");
            return;
        }

        if (!window.confirm(`Bạn có chắc muốn xóa tài khoản "${targetUser.name}" (${targetUser.email})? Hành động này không thể hoàn tác.`)) {
            return;
        }

        try {
            await deleteUser(targetUser.id);
            toast.success(`Đã xóa tài khoản ${targetUser.name} thành công!`);
            loadUsers();
        } catch (err) {
            const errMsg = err.response?.data?.message || "Lỗi khi xóa người dùng";
            toast.error(errMsg);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password) {
            toast.error("Vui lòng nhập đầy đủ thông tin!");
            return;
        }

        setSubmitting(true);
        try {
            await createUser(formData);
            toast.success(`Tạo tài khoản "${formData.name}" thành công!`);
            setShowModal(false);
            setFormData(defaultNewUser);
            loadUsers();
        } catch (err) {
            const errMsg = err.response?.data?.message || "Lỗi khi tạo người dùng";
            toast.error(errMsg);
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
                        Tổng số: {total} tài khoản trong hệ thống
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

            {/* Filter Toolbar */}
            <div className="users-filters-bar">
                <div className="users-search-wrapper">
                    <Search size={15} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc email..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <select
                    className="users-role-select"
                    value={roleFilter}
                    onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Tất cả vai trò</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                    <option value="customer">Khách hàng (Customer)</option>
                    <option value="supplier">Nhà cung cấp (Supplier)</option>
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
                            <th>Nâng quyền</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && users.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                                    Đang tải dữ liệu...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#888" }}>
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
                                                <div className="user-avatar-circle">
                                                    {item.avatar_url
                                                        ? <img src={item.avatar_url} alt={`Avatar ${item.name}`} />
                                                        : initial}
                                                </div>
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
                                                {item.role === "admin" ? "Admin" : item.role === "supplier" ? "Supplier" : "Customer"}
                                            </span>
                                        </td>
                                        <td style={{ color: "#666", fontSize: "11px" }}>
                                            {formattedDate}
                                        </td>
                                        <td>
                                            <div className="users-action-btns">
                                                {item.supplier_requested && item.role === "customer" && (
                                                    <button
                                                        type="button"
                                                        className="btn-approve-supplier"
                                                        onClick={() => handleApproveSupplier(item)}
                                                    >
                                                        <UserCheck size={12} style={{ marginRight: "4px" }} />
                                                        DUYỆT SUPPLIER
                                                    </button>
                                                )}

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
                                            </div>
                                        </td>
                                        <td>
                                            <div className="users-action-btns">
                                                {item.role === "customer" && (
                                                    <button
                                                        type="button"
                                                        className="btn-toggle-role"
                                                        onClick={() => {
                                                            const note = window.prompt("Ghi chú nội bộ:");
                                                            if (note !== null) updateCustomerStatus(item.id, item.status === "BLOCKED" ? "ACTIVE" : "BLOCKED", note).then(loadUsers);
                                                        }}
                                                    >
                                                        <Shield size={12} style={{ marginRight: "4px" }} />
                                                        {item.status === "BLOCKED" ? "MỞ KHÓA" : "KHÓA"}
                                                    </button>
                                                )}

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

            <Pagination page={page} totalPages={getTotalPages(total)} onChange={setPage} disabled={loading} />

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
                                    <option value="supplier">Nhà cung cấp (Supplier)</option>
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
