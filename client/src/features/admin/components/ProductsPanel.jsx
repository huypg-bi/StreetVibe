import { useCallback, useEffect, useState } from "react";
import { PackagePlus, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { getCategories } from "../../products/api/productsApi";
import AdminModal from "./AdminModal";
import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadImg,
} from "../api/adminApi";
import { validateProduct } from "../utils/validateProduct";
import {
    getProductCategoryOptions,
    isApparelCategory,
} from "../../products/utils/categoryHierarchy";
import { getAttributes } from "../../../shared/api/marketplaceApi";
import "../styles/productsPanel.css";

const emptyCreateForm = {
    name: "",
    brand: "",
    fit: "",
    description: "",
    price: "",
    stock: "",
    soldCount: "",
    isFeatured: "false",
    categoryId: "",
    colorIds: [],
};

function ProductColorPicker({ colors, selectedColorIds, onChange, error }) {
    return (
        <div className="admin-modal-field admin-modal-field-full">
            <label>Màu sắc sản phẩm</label>
            {colors.length > 0 ? (
                <div className="admin-product-color-options">
                    {colors.map((color) => {
                        const id = color.id ?? color._id;
                        return (
                            <label key={id} className="admin-product-color-option">
                                <input
                                    type="checkbox"
                                    checked={selectedColorIds.includes(id)}
                                    onChange={(event) => onChange(id, event.target.checked)}
                                />
                                <span className="admin-product-color-swatch" style={{ backgroundColor: color.hex_code }} />
                                <span>{color.name}</span>
                            </label>
                        );
                    })}
                </div>
            ) : (
                <small className="admin-product-form-hint">
                    {error || "Chưa có màu chuẩn. Hãy thêm màu trong Quản lý thuộc tính."}
                </small>
            )}
        </div>
    );
}

export default function ProductsPanel() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [colors, setColors] = useState([]);
    const [attributesError, setAttributesError] = useState("");
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [loadError, setLoadError] = useState("");

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState(emptyCreateForm);
    const [createErrors, setCreateErrors] = useState({});
    const [createFiles, setCreateFiles] = useState(null);
    const [uploadMessage, setUploadMessage] = useState("");
    const [uploadError, setUploadError] = useState("");
    const closeCreateForm = useCallback(() => setShowCreateForm(false), []);

    const [showUpdateForm, setShowUpdateForm] = useState(false);
    const [updateForm, setUpdateForm] = useState(null);
    const [updateFile, setUpdateFile] = useState(null);
    const [updateMessage, setUpdateMessage] = useState("");
    const productCategories = getProductCategoryOptions(categories);

    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getProducts({ search, limit: 50 });
            setProducts(data);
            setLoadError("");
        } catch (error) {
            console.error("Lỗi khi tải danh sách sản phẩm:", error);
            setLoadError("Không thể tải danh sách sản phẩm. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timeout = setTimeout(loadProducts, 300);
        return () => clearTimeout(timeout);
    }, [loadProducts]);

    useEffect(() => {
        getCategories()
            .then(setCategories)
            .catch((error) => console.error("Lỗi khi tải danh mục:", error));
        getAttributes()
            .then((attributes) => {
                setColors(attributes?.colors || []);
                setAttributesError("");
            })
            .catch((error) => {
                console.error("Lỗi khi tải màu chuẩn:", error);
                setAttributesError("Không thể tải danh sách màu chuẩn.");
            });
    }, []);

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setCreateErrors({});
        setUploadError("");

        let imgUrl = [];

        if (createFiles && createFiles.length > 0) {
            if (createFiles.length > 5) {
                setUploadError("Chỉ được upload tối đa 5 ảnh");
                return;
            }

            setUploadMessage(`Đang upload ${createFiles.length} ảnh...`);

            for (const file of Array.from(createFiles)) {
                try {
                    const result = await uploadImg(file);
                    if (result.url) imgUrl.push(result.url);
                } catch (error) {
                    console.error(error);
                    setUploadError("Upload ảnh thất bại");
                }
            }

            setUploadMessage("Upload ảnh thành công");
        }

        const product = {
            name: createForm.name,
            brand: createForm.brand,
            fit: createForm.fit,
            description: createForm.description,
            price: Number(createForm.price),
            stock: Number(createForm.stock),
            soldCount: Number(createForm.soldCount),
            isFeatured: createForm.isFeatured === "true",
            categoryId: createForm.categoryId,
            colorIds: createForm.colorIds,
            image: imgUrl[0],
        };

        const errors = validateProduct(product);

        if (Object.keys(errors).length > 0) {
            setCreateErrors(errors);
            return;
        }

        try {
            await createProduct(product);
            setCreateForm(emptyCreateForm);
            setCreateFiles(null);
            setShowCreateForm(false);
            await loadProducts();
            alert("Tạo sản phẩm thành công");
        } catch (error) {
            console.error(error);
            alert("Tạo sản phẩm thất bại");
        }
    };

    const startEdit = (product) => {
        const categoryId = product.category?._id ?? product.category_id ?? "";
        setUpdateForm({
            id: product._id,
            name: product.name,
            brand: product.brand ?? "",
            fit: isApparelCategory(categoryId, categories) ? product.fit ?? "" : "",
            description: product.description,
            price: product.price,
            stock: product.stock,
            soldCount: product.soldCount,
            isFeatured: String(product.isFeatured),
            categoryId,
            colorIds: (product.colors || []).map((color) => color.id ?? color._id),
            currentImage: product.image,
        });
        setUpdateFile(null);
        setUpdateMessage("");
        setShowUpdateForm(true);
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        setUpdateMessage("");

        try {
            let imgUrl = updateForm.currentImage ?? "";

            if (updateFile) {
                setUpdateMessage("Đang upload ảnh...");
                const result = await uploadImg(updateFile);
                imgUrl = result?.url ?? imgUrl;
            }

            const product = {
                id: updateForm.id,
                name: updateForm.name,
                brand: updateForm.brand,
                fit: isApparelCategory(updateForm.categoryId, categories) ? updateForm.fit : "",
                description: updateForm.description,
                price: Number(updateForm.price),
                stock: Number(updateForm.stock),
                soldCount: Number(updateForm.soldCount),
                isFeatured: updateForm.isFeatured === "true",
                categoryId: updateForm.categoryId,
                colorIds: updateForm.colorIds,
                image: imgUrl,
            };

            await updateProduct(product);
            setShowUpdateForm(false);
            await loadProducts();
        } catch (error) {
            console.error(error);
            setUpdateMessage("Cập nhật sản phẩm thất bại.");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Bạn muốn xóa sản phẩm này?")) return;
        await deleteProduct(id);
        loadProducts();
    };

    return (
        <div className="products-container products-panel-container">
            <div className="products-panel-header">
                <div>
                    <h1>Quản lý sản phẩm</h1>
                    <p>Tổng số: {products.length} sản phẩm đang hiển thị</p>
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
                    <button type="button" className="btn-add-product" onClick={() => setShowCreateForm(true)}>
                        <PackagePlus size={15} />
                        Thêm sản phẩm
                    </button>
                </div>
            </div>

            {loadError && <div className="products-panel-alert error" role="alert">{loadError}</div>}

            <div className="products-filters-bar">
                <div className="products-search-wrapper">
                    <Search size={15} className="search-icon" />
                    <input
                        type="search"
                        placeholder="Tìm theo tên hoặc mô tả..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>
            </div>

            {showCreateForm && (
                <AdminModal
                    title="Thêm sản phẩm"
                    titleId="create-product-modal-title"
                    eyebrow="[ NEW INVENTORY UNIT ]"
                    onClose={closeCreateForm}
                >
                    <form onSubmit={handleCreateSubmit} className="admin-modal-form">
                        <div className="admin-modal-form-grid">
                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="create-product-name">Tên sản phẩm</label>
                                <input
                                    id="create-product-name"
                                    type="text"
                                    placeholder="Tên sản phẩm"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                                    autoFocus
                                />
                                {createErrors.name && <p className="admin-modal-error">{createErrors.name}</p>}
                            </div>

                            <div className="admin-modal-field">
                                <label htmlFor="create-product-price">Giá</label>
                                <input
                                    id="create-product-price"
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="Giá"
                                    value={createForm.price}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, price: e.target.value }))}
                                />
                                {createErrors.price && <p className="admin-modal-error">{createErrors.price}</p>}
                            </div>

                            <div className="admin-modal-field">
                                <label htmlFor="create-product-stock">Số lượng tồn kho</label>
                                <input
                                    id="create-product-stock"
                                    type="number"
                                    min="0"
                                    placeholder="Số lượng tồn kho"
                                    value={createForm.stock}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, stock: e.target.value }))}
                                />
                                {createErrors.stock && <p className="admin-modal-error">{createErrors.stock}</p>}
                            </div>

                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="create-product-description">Mô tả</label>
                                <textarea
                                    id="create-product-description"
                                    placeholder="Mô tả sản phẩm"
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                                    rows="3"
                                />
                                {createErrors.description && <p className="admin-modal-error">{createErrors.description}</p>}
                            </div>

                            <div className="admin-modal-field">
                                <label htmlFor="create-product-sold-count">Số lượng đã bán</label>
                                <input
                                    id="create-product-sold-count"
                                    type="number"
                                    min="0"
                                    placeholder="Số lượng đã bán"
                                    value={createForm.soldCount}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, soldCount: e.target.value }))}
                                />
                            </div>

                            <div className="admin-modal-field">
                                <label htmlFor="create-product-featured">Trạng thái nổi bật</label>
                                <select
                                    id="create-product-featured"
                                    value={createForm.isFeatured}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, isFeatured: e.target.value }))}
                                >
                                    <option value="false">Normal</option>
                                    <option value="true">HOT</option>
                                </select>
                            </div>

                            <div className="admin-modal-field">
                                <label htmlFor="create-product-fit">Form dáng</label>
                                <select
                                    id="create-product-fit"
                                    value={createForm.fit}
                                    disabled={!isApparelCategory(createForm.categoryId, categories)}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, fit: e.target.value }))}
                                >
                                    <option value="">
                                        {isApparelCategory(createForm.categoryId, categories) ? "-- Chọn form dáng --" : "Chỉ áp dụng cho Apparel"}
                                    </option>
                                    <option value="BOXY_FIT">Boxy Fit</option>
                                    <option value="OVERSIZED">Oversized</option>
                                    <option value="RELAXED_DROP">Relaxed Drop</option>
                                </select>
                            </div>

                            <div className="admin-modal-field">
                                <label htmlFor="create-product-category">Danh mục</label>
                                <select
                                    id="create-product-category"
                                    required
                                    value={createForm.categoryId}
                                    onChange={(e) => {
                                        const categoryId = e.target.value;
                                        setCreateForm((f) => ({
                                            ...f,
                                            categoryId,
                                            fit: isApparelCategory(categoryId, categories) ? f.fit : "",
                                        }));
                                    }}
                                >
                                    <option value="">-- Chọn category --</option>
                                    {productCategories.map((category) => (
                                        <option key={category._id} value={category._id}>{category.displayName}</option>
                                    ))}
                                </select>
                                {createErrors.categoryId && <p className="admin-modal-error">{createErrors.categoryId}</p>}
                            </div>

                            <div className="admin-modal-field">
                                <label htmlFor="create-product-brand">Thương hiệu</label>
                                <input
                                    id="create-product-brand"
                                    type="text"
                                    placeholder="Thương hiệu"
                                    value={createForm.brand}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, brand: e.target.value }))}
                                />
                            </div>

                            <div className="admin-modal-field">
                                <label htmlFor="create-product-images">Ảnh sản phẩm (tối đa 5 ảnh)</label>
                                <input
                                    id="create-product-images"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => setCreateFiles(e.target.files)}
                                />
                            </div>

                            <ProductColorPicker
                                colors={colors}
                                selectedColorIds={createForm.colorIds}
                                error={attributesError}
                                onChange={(id, checked) => setCreateForm((form) => ({
                                    ...form,
                                    colorIds: checked
                                        ? [...form.colorIds, id]
                                        : form.colorIds.filter((colorId) => colorId !== id),
                                }))}
                            />

                        </div>

                        {(uploadError || uploadMessage) && (
                            <div className={`admin-modal-notice${uploadError ? " error" : ""}`} role="status">
                                {uploadError || uploadMessage}
                            </div>
                        )}

                        <div className="admin-modal-actions">
                            <button type="button" className="admin-modal-cancel" onClick={closeCreateForm}>Hủy</button>
                            <button type="submit" className="admin-modal-submit">Lưu sản phẩm</button>
                        </div>
                    </form>
                </AdminModal>
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
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Tên sản phẩm</th>
                            <th>Mô tả</th>
                            <th>Giá</th>
                            <th>Danh mục</th>
                            <th>Thương hiệu</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && products.length === 0 ? (
                            <tr><td colSpan={6} className="products-table-empty">Đang tải dữ liệu...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={6} className="products-table-empty">Không tìm thấy sản phẩm phù hợp.</td></tr>
                        ) : products.map((product) => (
                            <tr key={product._id}>
                                <td className="products-table-name">{product.name}</td>
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showUpdateForm && updateForm && (
                <AdminModal
                    title="Sửa sản phẩm"
                    titleId="update-product-modal-title"
                    eyebrow="[ EDIT INVENTORY UNIT ]"
                    onClose={() => setShowUpdateForm(false)}
                >
                    <form onSubmit={handleUpdateSubmit} className="admin-modal-form">
                        <div className="admin-modal-form-grid">
                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="update-product-name">Tên sản phẩm</label>
                                <input
                                    id="update-product-name"
                                    value={updateForm.name}
                                    onChange={(e) => setUpdateForm((f) => ({ ...f, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="admin-modal-field">
                                <label htmlFor="update-product-price">Giá</label>
                                <input
                                    id="update-product-price"
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={updateForm.price}
                                    onChange={(e) => setUpdateForm((f) => ({ ...f, price: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="admin-modal-field">
                                <label htmlFor="update-product-stock">Số lượng tồn kho</label>
                                <input
                                    id="update-product-stock"
                                    type="number"
                                    min="0"
                                    value={updateForm.stock}
                                    onChange={(e) => setUpdateForm((f) => ({ ...f, stock: e.target.value }))}
                                />
                            </div>
                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="update-product-description">Mô tả</label>
                                <textarea
                                    id="update-product-description"
                                    rows="3"
                                    value={updateForm.description}
                                    onChange={(e) => setUpdateForm((f) => ({ ...f, description: e.target.value }))}
                                />
                            </div>
                            <div className="admin-modal-field">
                                <label htmlFor="update-product-sold-count">Số lượng đã bán</label>
                                <input
                                    id="update-product-sold-count"
                                    type="number"
                                    min="0"
                                    value={updateForm.soldCount}
                                    onChange={(e) => setUpdateForm((f) => ({ ...f, soldCount: e.target.value }))}
                                />
                            </div>
                            <div className="admin-modal-field">
                                <label htmlFor="update-product-featured">Trạng thái nổi bật</label>
                                <select
                                    id="update-product-featured"
                                    value={updateForm.isFeatured}
                                    onChange={(e) => setUpdateForm((f) => ({ ...f, isFeatured: e.target.value }))}
                                >
                                    <option value="false">Normal</option>
                                    <option value="true">HOT</option>
                                </select>
                            </div>
                            <div className="admin-modal-field">
                                <label htmlFor="update-product-fit">Form dáng</label>
                                <select
                                    id="update-product-fit"
                                    value={updateForm.fit}
                                    disabled={!isApparelCategory(updateForm.categoryId, categories)}
                                    onChange={(e) => setUpdateForm((f) => ({ ...f, fit: e.target.value }))}
                                >
                                    <option value="">
                                        {isApparelCategory(updateForm.categoryId, categories) ? "-- Chọn form dáng --" : "Chỉ áp dụng cho Apparel"}
                                    </option>
                                    <option value="BOXY_FIT">Boxy Fit</option>
                                    <option value="OVERSIZED">Oversized</option>
                                    <option value="RELAXED_DROP">Relaxed Drop</option>
                                </select>
                            </div>

                            <div className="admin-modal-field">
                                <label htmlFor="update-product-category">Danh mục</label>
                                <select
                                    id="update-product-category"
                                    value={updateForm.categoryId}
                                    onChange={(e) => {
                                        const categoryId = e.target.value;
                                        setUpdateForm((f) => ({
                                            ...f,
                                            categoryId,
                                            fit: isApparelCategory(categoryId, categories) ? f.fit : "",
                                        }));
                                    }}
                                    required
                                >
                                    <option value="">-- Chọn category --</option>
                                    {productCategories.map((category) => (
                                        <option key={category._id} value={category._id}>{category.displayName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-modal-field">
                                <label htmlFor="update-product-brand">Thương hiệu</label>
                                <input
                                    id="update-product-brand"
                                    value={updateForm.brand}
                                    onChange={(e) => setUpdateForm((f) => ({ ...f, brand: e.target.value }))}
                                />
                            </div>
                            <div className="admin-modal-field">
                                <label htmlFor="update-product-image">Ảnh sản phẩm</label>
                                <input
                                    id="update-product-image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setUpdateFile(e.target.files[0])}
                                />
                            </div>
                            <ProductColorPicker
                                colors={colors}
                                selectedColorIds={updateForm.colorIds}
                                error={attributesError}
                                onChange={(id, checked) => setUpdateForm((form) => ({
                                    ...form,
                                    colorIds: checked
                                        ? [...form.colorIds, id]
                                        : form.colorIds.filter((colorId) => colorId !== id),
                                }))}
                            />
                        </div>
                        {updateMessage && <div className="admin-modal-notice error" role="status">{updateMessage}</div>}
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

function truncateWords(text = "", limit) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= limit) return text;
    return `${words.slice(0, limit).join(" ")}...`;
}
