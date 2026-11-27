import { useCallback, useEffect, useState } from "react";
import { Eye, PackagePlus, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { getCategories } from "../../products/api/productsApi";
import AdminModal from "./AdminModal";
import {
    getProductsPage,
    getProductById,
    deleteProduct,
} from "../api/adminApi";
import AdminProductFormModal from "./AdminProductFormModal";
import { getAttributes } from "../../../shared/api/marketplaceApi";
import Pagination from "../../../shared/components/Pagination";
import ProductDetailView from "../../../shared/components/ProductDetailView";
import { PAGE_SIZE } from "../../../shared/utils/pagination";
import "../styles/productsPanel.css";
import { getErrorMessage, toast } from "../../../shared/utils/toast";

export default function ProductsPanel() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [attributes, setAttributes] = useState({ sizes: [], colors: [], sports: [] });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 1 });
    const [detail, setDetail] = useState(null); // { product, variantsMessage }

    const [productForm, setProductForm] = useState(null); // { product } | null; product = null là tạo mới

    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getProductsPage({ search, page, limit: PAGE_SIZE });
            // Trang hiện tại có thể trống sau khi xóa sản phẩm cuối cùng của trang
            if (page > data.totalPages) {
                setPage(data.totalPages);
                return;
            }
            setProducts(data.items);
            setPageInfo({ total: data.total, totalPages: data.totalPages });
        } catch (error) {
            console.error("Lỗi khi tải danh sách sản phẩm:", error);
            toast.error("Không thể tải danh sách sản phẩm. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    useEffect(() => {
        const timeout = setTimeout(loadProducts, 300);
        return () => clearTimeout(timeout);
    }, [loadProducts]);

    useEffect(() => {
        getCategories()
            .then(setCategories)
            .catch((error) => {
                console.error("Lỗi khi tải danh mục:", error);
                toast.error("Không thể tải danh mục.");
            });
        getAttributes()
            .then((data) => setAttributes(data || { sizes: [], colors: [], sports: [] }))
            .catch((error) => {
                console.error("Lỗi khi tải thuộc tính:", error);
                toast.error("Không thể tải thuộc tính sản phẩm.");
            });
    }, []);

    const showDetail = async (product) => {
        setDetail({ product, variantsMessage: "Đang tải biến thể..." });
        let next;
        try {
            next = { product: await getProductById(product._id), variantsMessage: "" };
        } catch (error) {
            console.error("Lỗi khi tải chi tiết sản phẩm:", error);
            next = { product, variantsMessage: "Không thể tải biến thể của sản phẩm." };
        }
        // Bỏ qua nếu popup đã đóng hoặc đang mở sản phẩm khác
        setDetail((current) => (current?.product._id === product._id ? next : current));
    };

    const startEdit = async (product) => {
        try {
            // Cần dữ liệu chi tiết để biết sản phẩm đã có biến thể hay chưa
            setProductForm({ product: await getProductById(product._id) });
        } catch (error) {
            console.error(error);
            toast.error("Không thể tải sản phẩm để sửa.");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Bạn muốn xóa sản phẩm này?")) return;
        try {
            await deleteProduct(id);
            toast.success("Đã xóa sản phẩm.");
            await loadProducts();
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error, "Không thể xóa sản phẩm."));
        }
    };

    return (
        <div className="products-container products-panel-container">
            <div className="products-panel-header">
                <div>
                    <h1>Quản lý sản phẩm</h1>
                    <p>Tổng số: {pageInfo.total} sản phẩm đang hiển thị</p>
                </div>
                <div className="products-header-actions">
                    <button
                        type="button"
                        className="btn-panel-refresh"
                        onClick={loadProducts}
                        title="Tải lại danh sách"
                        disabled={loading}
                    >
                        <RefreshCw size={15} className={loading ? "spin" : ""} />
                    </button>
                    <button type="button" className="btn-add-product" onClick={() => setProductForm({ product: null })}>
                        <PackagePlus size={15} />
                        Thêm sản phẩm
                    </button>
                </div>
            </div>

            <div className="products-filters-bar">
                <div className="products-search-wrapper">
                    <Search size={15} className="search-icon" />
                    <input
                        type="search"
                        placeholder="Tìm theo tên hoặc mô tả..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            {productForm && (
                <AdminProductFormModal
                    product={productForm.product}
                    categories={categories}
                    attributes={attributes}
                    onClose={() => setProductForm(null)}
                    onReload={loadProducts}
                    onSaved={async () => {
                        setProductForm(null);
                        await loadProducts();
                    }}
                />
            )}

            <div className="products-table-wrapper">
                <table className="products-table">
                    <colgroup>
                        <col className="products-name-column" />
                        <col className="products-description-column" />
                        <col className="products-price-column" />
                        <col className="products-category-column" />
                        <col className="products-brand-column" />
                        <col className="products-actions-column" />
                        <col className="products-detail-column" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Tên sản phẩm</th>
                            <th>Mô tả</th>
                            <th>Giá</th>
                            <th>Danh mục</th>
                            <th>Thương hiệu</th>
                            <th>Hành động</th>
                            <th>Chi tiết</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && products.length === 0 ? (
                            <tr><td colSpan={7} className="products-table-empty">Đang tải dữ liệu...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={7} className="products-table-empty">Không tìm thấy sản phẩm phù hợp.</td></tr>
                        ) : products.map((product) => (
                            <tr key={product._id}>
                                <td className="products-table-name">
                                    {product.name}
                                    <span className="admin-sku-code">{product.sku}</span>
                                </td>
                                <td className="products-table-description" title={product.description}>
                                    {truncateWords(product.description, 10)}
                                </td>
                                <td>{Number(product.price).toLocaleString("vi-VN")} ₫</td>
                                <td>{product.category?.name ?? "-"}</td>
                                <td>{product.brand || "-"}</td>
                                <td>
                                    <div className="products-table-actions">
                                        <button type="button" className="btn-product-edit" onClick={() => startEdit(product)}>
                                            <Pencil size={13} /> Sửa
                                        </button>
                                        <button type="button" className="btn-product-delete" onClick={() => handleDelete(product._id)}>
                                            <Trash2 size={13} /> Xóa
                                        </button>
                                    </div>
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className="marketplace-product-eye-btn"
                                        title="Xem chi tiết sản phẩm"
                                        aria-label={`Xem chi tiết ${product.name}`}
                                        onClick={() => showDetail(product)}
                                    >
                                        <Eye size={15} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination page={page} totalPages={pageInfo.totalPages} onChange={setPage} disabled={loading} />

            {detail && (
                <AdminModal
                    eyebrow="[ PRODUCT DETAIL ]"
                    titleId="product-detail-title"
                    title={detail.product.name}
                    onClose={() => setDetail(null)}
                >
                    <ProductDetailView product={detail.product} variantsMessage={detail.variantsMessage} />
                </AdminModal>
            )}

        </div>
    );
}

function truncateWords(text = "", limit) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= limit) return text;
    return `${words.slice(0, limit).join(" ")}...`;
}
