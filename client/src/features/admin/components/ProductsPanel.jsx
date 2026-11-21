import { useCallback, useEffect, useState } from "react";
import { getCategories } from "../../products/api/productsApi";
import AdminModal from "./AdminModal";
import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    patchFlagProduct,
    uploadImg,
} from "../api/adminApi";
import { validateProduct } from "../utils/validateProduct";

const emptyCreateForm = {
    name: "",
    description: "",
    price: "",
    stock: "",
    soldCount: "",
    isFeatured: "false",
    categoryId: "",
};

export default function ProductsPanel() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

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

    const loadProducts = useCallback(async () => {
        const data = await getProducts();
        setProducts(data);
    }, []);

    useEffect(() => {
        // loadProducts() is an async refetch also reused by the create/update/delete/flag handlers;
        // its setState calls run after the await, not synchronously in this effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProducts().catch((error) => console.error(error));
        getCategories().then(setCategories);
    }, [loadProducts]);

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
            description: createForm.description,
            price: Number(createForm.price),
            stock: Number(createForm.stock),
            soldCount: Number(createForm.soldCount),
            isFeatured: createForm.isFeatured === "true",
            categoryId: createForm.categoryId,
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
        setUpdateForm({
            id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            soldCount: product.soldCount,
            isFeatured: String(product.isFeatured),
            categoryId: product.category._id,
            currentImage: product.image,
        });
        setUpdateFile(null);
        setUpdateMessage("");
        setShowUpdateForm(true);
    };

    const handleUpdateSubmit = async () => {
        setUpdateMessage("");

        let imgUrl = updateForm.currentImage ?? "";

        if (updateFile) {
            setUpdateMessage("Đang upload ảnh...");
            const result = await uploadImg(updateFile);
            imgUrl = result?.url ?? imgUrl;
        }

        const product = {
            id: updateForm.id,
            name: updateForm.name,
            description: updateForm.description,
            price: Number(updateForm.price),
            stock: Number(updateForm.stock),
            soldCount: Number(updateForm.soldCount),
            isFeatured: updateForm.isFeatured === "true",
            categoryId: updateForm.categoryId,
            image: imgUrl,
        };

        await updateProduct(product);
        setUpdateMessage("Cập nhật thành công!");
        setShowUpdateForm(false);
        loadProducts();
    };

    const handleDelete = async (id) => {
        if (!confirm("Bạn muốn xóa sản phẩm này?")) return;
        await deleteProduct(id);
        loadProducts();
    };

    const handleFlag = async (id, isFeatured) => {
        await patchFlagProduct(id, { isFeatured: !isFeatured });
        loadProducts();
    };

    return (
        <div className="products-container">
            <div className="admin-management-header">
                <div>
                    <span className="admin-management-eyebrow">[ INVENTORY MATRIX ]</span>
                    <h1>Quản lý sản phẩm</h1>
                </div>
                <button
                    type="button"
                    className="admin-add-button"
                    onClick={() => setShowCreateForm(true)}
                >
                    + Thêm sản phẩm
                </button>
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

                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="create-product-category">Danh mục</label>
                                <select
                                    id="create-product-category"
                                    value={createForm.categoryId}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, categoryId: e.target.value }))}
                                >
                                    <option value="">-- Chọn category --</option>
                                    {categories.map((c) => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                                {createErrors.categoryId && <p className="admin-modal-error">{createErrors.categoryId}</p>}
                            </div>

                            <div className="admin-modal-field admin-modal-field-full">
                                <label htmlFor="create-product-images">Ảnh sản phẩm (tối đa 5 ảnh)</label>
                                <input
                                    id="create-product-images"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => setCreateFiles(e.target.files)}
                                />
                            </div>
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

            <table>
                <tbody>
                    <tr>
                        <th>Tên</th>
                        <th>Mô tả</th>
                        <th>Giá</th>
                        <th>Danh mục sản phẩm</th>
                        <th>Nổi bật</th>
                        <th>Trạng thái</th>
                    </tr>

                    {products.map((product) => (
                        <tr key={product._id}>
                            <td>{product.name}</td>
                            <td>{product.description}</td>
                            <td>{product.price}</td>
                            <td>{product.category.name}</td>
                            <td>{product.isFeatured ? "Có" : "Không"}</td>
                            <td>
                                <button type="button" onClick={() => handleDelete(product._id)}>Xóa</button>
                                <button type="button" onClick={() => startEdit(product)}>Sửa</button>
                                <button type="button" onClick={() => handleFlag(product._id, product.isFeatured)}>
                                    {product.isFeatured ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Thêm form edit */}
            {showUpdateForm && updateForm && (
                <div id="updateForm">
                    <input
                        type="text"
                        placeholder="Tên sản phẩm"
                        value={updateForm.name}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Mô tả"
                        value={updateForm.description}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, description: e.target.value }))}
                    />
                    <input
                        type="number"
                        placeholder="Giá"
                        value={updateForm.price}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, price: e.target.value }))}
                    />
                    <input
                        type="number"
                        placeholder="Số lượng tồn kho"
                        value={updateForm.stock}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, stock: e.target.value }))}
                    />
                    <input
                        type="number"
                        placeholder="Số lượng đã bán"
                        value={updateForm.soldCount}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, soldCount: e.target.value }))}
                    />
                    <select
                        value={updateForm.isFeatured}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, isFeatured: e.target.value }))}
                    >
                        <option value="false">Normal</option>
                        <option value="true">HOT</option>
                    </select>
                    <select
                        value={updateForm.categoryId}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, categoryId: e.target.value }))}
                    >
                        <option value="">-- Chọn category --</option>
                        {categories.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                    </select>
                    <input type="file" accept="image/*" onChange={(e) => setUpdateFile(e.target.files[0])} />
                    <p style={{ color: "green" }}>{updateMessage}</p>
                    <div className="form-actions">
                        <button type="button" className="btn-save" onClick={handleUpdateSubmit}>Cập nhật</button>
                        <button type="button" className="btn-cancel" onClick={() => setShowUpdateForm(false)}>Hủy</button>
                    </div>
                </div>
            )}
        </div>
    );
}
