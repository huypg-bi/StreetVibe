import { useCallback, useEffect, useState } from "react";
import { Eye, Package, RefreshCw, Search } from "lucide-react";
import { getAdminInventory, getSuppliers } from "../../../shared/api/marketplaceApi";
import AdminModal from "./AdminModal";
import PaginatedList from "../../../shared/components/PaginatedList";
import "../styles/productsPanel.css";
import "../styles/inventoryPanel.css";
import { toast } from "../../../shared/utils/toast";

export default function InventoryPanel() {
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState({ total_products: 0, total_stock: 0, total_sold: 0 });
    const [suppliers, setSuppliers] = useState([]);
    const [supplierId, setSupplierId] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const loadInventory = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminInventory({
                ...(supplierId ? { supplier_id: supplierId } : {}),
                ...(search.trim() ? { search: search.trim() } : {}),
            });
            setItems(data?.items || []);
            setSummary(data?.summary || { total_products: 0, total_stock: 0, total_sold: 0 });
        } catch (err) {
            console.error("Lỗi khi tải kho hàng:", err);
            toast.error("Không thể tải dữ liệu kho hàng.");
        } finally {
            setLoading(false);
        }
    }, [supplierId, search]);

    useEffect(() => {
        getSuppliers()
            .then((res) => setSuppliers(res?.items || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const timer = setTimeout(loadInventory, 250);
        return () => clearTimeout(timer);
    }, [loadInventory]);

    return (
        <div className="products-container products-panel-container inventory-panel">
            <div className="products-panel-header">
                <div>
                    <h1>Quản lý kho hàng theo Supplier</h1>
                    <p>Theo dõi lượng hàng tồn kho và đã bán của từng nhà cung cấp (chế độ giám sát).</p>
                </div>
                <div className="products-header-actions">
                    <button
                        type="button"
                        className="btn-panel-refresh"
                        onClick={loadInventory}
                        disabled={loading}
                        title="Tải lại kho"
                    >
                        <RefreshCw size={15} className={loading ? "spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="marketplace-admin-kpis inventory-kpis">
                <article>
                    <span>TỔNG MẶT HÀNG</span>
                    <strong>{summary.total_products}</strong>
                </article>
                <article>
                    <span>LƯỢNG HÀNG HIỆN CÓ</span>
                    <strong>{summary.total_stock}</strong>
                </article>
                <article>
                    <span>TỔNG ĐÃ BÁN</span>
                    <strong>{summary.total_sold}</strong>
                </article>
            </div>

            <div className="products-filters-bar inventory-filters">
                <div className="products-search-wrapper">
                    <Search size={15} className="search-icon" />
                    <input
                        type="search"
                        placeholder="Tìm tên sản phẩm hoặc thương hiệu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    aria-label="Lọc theo Supplier"
                    className="inventory-supplier-filter"
                >
                    <option value="">Tất cả Supplier</option>
                    {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                            {sup.brand_name} ({sup.status})
                        </option>
                    ))}
                </select>
            </div>

            <PaginatedList items={items} resetKey={`${supplierId}|${search}`}>
                {(rows) => (
                    <div className="products-table-wrapper">
                        <table className="products-table">
                            <colgroup>
                                <col className="inventory-name-column" />
                                <col className="inventory-supplier-column" />
                                <col className="inventory-category-column" />
                                <col className="inventory-stock-column" />
                                <col className="inventory-sold-column" />
                                <col className="inventory-status-column" />
                                <col className="inventory-detail-column" />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Sản phẩm</th>
                                    <th>Supplier</th>
                                    <th>Danh mục</th>
                                    <th>Lượng hàng hiện có</th>
                                    <th>Đã bán</th>
                                    <th>Trạng thái kho</th>
                                    <th>Chi tiết biến thể</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((item) => {
                                    const stockStatus =
                                        item.stock <= 0 ? "Hết hàng" : item.stock <= 5 ? "Sắp hết" : "Còn hàng";
                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="inventory-product">
                                                    {item.image ? (
                                                        <img
                                                            src={item.image}
                                                            alt={item.name}
                                                            className="inventory-product-thumb"
                                                        />
                                                    ) : (
                                                        <Package size={24} />
                                                    )}
                                                    <div>
                                                        <strong>{item.name}</strong>
                                                        <span className="admin-sku-code">{item.sku}</span>
                                                        {item.sport?.name && (
                                                            <div className="inventory-product-sport">Thể thao: {item.sport.name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{item.supplier?.brand_name || item.brand || "Atelier"}</td>
                                            <td>{item.category?.name || "-"}</td>
                                            <td><strong>{item.stock}</strong></td>
                                            <td><strong>{item.sold_count ?? 0}</strong></td>
                                            <td>
                                                <span className={`tag-badge ${item.stock <= 0 ? "dim" : item.stock <= 5 ? "alert" : "outline"}`}>
                                                    {stockStatus}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="marketplace-product-eye-btn"
                                                    onClick={() => setSelectedItem(item)}
                                                    title="Xem biến thể tồn kho"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!loading && items.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="products-table-empty">
                                            Không có mặt hàng nào phù hợp.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </PaginatedList>

            {selectedItem && (
                <AdminModal
                    eyebrow="[ WAREHOUSE UNIT ]"
                    titleId="inventory-detail-title"
                    title={`CHI TIẾT KHO // ${selectedItem.name}`}
                    onClose={() => setSelectedItem(null)}
                >
                    <div>
                        <p className="inventory-detail-summary">
                            SKU: <strong>{selectedItem.sku}</strong> &bull;{" "}
                            Supplier: <strong>{selectedItem.supplier?.brand_name || selectedItem.brand || "N/A"}</strong> &bull;
                            Hiện có: <strong>{selectedItem.stock}</strong> &bull;
                            Đã bán: <strong>{selectedItem.sold_count ?? 0}</strong>
                        </p>
                        {selectedItem.variants && selectedItem.variants.length > 0 ? (
                            <table className="stream-table inventory-detail-table">
                                <thead>
                                    <tr>
                                        <th>Màu sắc</th>
                                        <th>Size</th>
                                        <th>Tồn kho</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedItem.variants.map((v) => (
                                        <tr key={v.id}>
                                            <td>{v.color?.name || "-"}</td>
                                            <td><strong>{v.size?.name || "-"}</strong></td>
                                            <td><strong>{v.stock_quantity}</strong></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="inventory-detail-empty">Sản phẩm này chưa có biến thể chi tiết.</p>
                        )}
                    </div>
                </AdminModal>
            )}
        </div>
    );
}
