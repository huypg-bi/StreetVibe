import { useState } from "react";
import AdminModal from "./AdminModal";
import { createProduct, updateProduct } from "../api/adminApi";
import { syncAdminProductVariants, updateAdminDiscount } from "../../../shared/api/marketplaceApi";
import { uploadImage } from "../../../shared/api/mediaApi";
import { getProductCategoryOptions, isApparelCategory } from "../../products/utils/categoryHierarchy";
import { getErrorMessage, toast } from "../../../shared/utils/toast";
import VariantEditor from "../../../shared/components/VariantEditor";
import { useProductOptions } from "../../../shared/hooks/useProductOptions";
import { PRODUCT_GENDERS, hasProductChanges } from "../../../shared/utils/productOptions";

const MAX_PRODUCT_IMAGES = 5;
const optionsApi = {
    syncVariants: syncAdminProductVariants,
    saveDiscount: updateAdminDiscount,
};

// Form tạo mới (product = null) hoặc sửa sản phẩm, cùng các trường với form của Supplier
export default function AdminProductFormModal({ product, categories, attributes, onClose, onSaved, onReload }) {
    const isEdit = Boolean(product);
    const sports = attributes.sports || [];
    // Sản phẩm vừa tạo nhưng lưu màu/size chưa xong: lần bấm sau là sửa, không tạo trùng
    const [createdProduct, setCreatedProduct] = useState(null);
    const savedProduct = product ?? createdProduct;
    const currentImages = savedProduct?.images?.length ? savedProduct.images : [savedProduct?.image].filter(Boolean);
    const [price, setPrice] = useState(String(product?.price ?? ""));
    const [cost, setCost] = useState(String(product?.original_price || ""));
    const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
    const [fit, setFit] = useState(product?.fit ?? "");
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const isApparel = isApparelCategory(categoryId, categories);
    const options = useProductOptions({ product, attributes, categoryId, categories, api: optionsApi });

    const handleFiles = (event) => {
        const selected = Array.from(event.target.files || []);
        if (selected.length > MAX_PRODUCT_IMAGES) {
            setFiles([]);
            toast.error(`Chỉ được chọn tối đa ${MAX_PRODUCT_IMAGES} ảnh sản phẩm.`);
            event.target.value = "";
            return;
        }
        setFiles(selected);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (!savedProduct && files.length === 0) {
            toast.error("Vui lòng chọn ít nhất một ảnh sản phẩm.");
            return;
        }
        const optionsError = options.validate();
        if (optionsError) {
            toast.error(optionsError);
            return;
        }
        setSubmitting(true);
        let target = savedProduct;
        let productSaved = false;
        try {
            // Không chọn ảnh mới khi sửa thì giữ ảnh hiện tại
            let images = currentImages;
            if (files.length > 0) {
                const uploaded = await Promise.all(files.map((file) => uploadImage(file)));
                images = uploaded.map((image) => image?.url);
                if (images.some((url) => !url)) throw new Error("Ảnh tải lên không có đường dẫn hợp lệ.");
            }
            const payload = {
                name: form.get("name"),
                brand: form.get("brand"),
                fit: isApparel ? fit : "",
                gender: form.get("gender"),
                description: form.get("description"),
                price: Number(form.get("price")),
                original_price: Number(form.get("original_price")),
                stock: options.usesVariants ? options.totalStock : Number(form.get("stock") || 0),
                image: images[0] || "",
                images,
                category_id: form.get("category_id"),
                sport_id: form.get("sport_id") || "",
            };
            const changed = !target || files.length > 0
                || hasProductChanges(target, payload, !options.usesVariants);
            if (!target) {
                target = await createProduct(payload);
                if (!target?.id) throw new Error("Không nhận được sản phẩm vừa tạo.");
                setCreatedProduct(target);
            } else if (changed) {
                await updateProduct(target.id, payload);
            }
            productSaved = changed;
            await options.save(target);
            toast.success(isEdit ? "Đã cập nhật sản phẩm." : "Tạo sản phẩm thành công.");
            await onSaved();
        } catch (error) {
            console.error("Không thể lưu sản phẩm:", error);
            const reason = getErrorMessage(error, isEdit ? "Cập nhật sản phẩm thất bại." : "Tạo sản phẩm thất bại.");
            if (productSaved) {
                toast.error(`Đã lưu thông tin sản phẩm nhưng chưa lưu được màu, size hoặc giảm giá: ${reason} Bấm lưu để thử lại.`);
                await onReload();
            } else {
                toast.error(reason);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminModal
            title={isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm"}
            titleId="admin-product-form-title"
            eyebrow={isEdit ? `[ EDIT // ${product.sku} ]` : "[ NEW INVENTORY UNIT ]"}
            onClose={onClose}
            wide
        >
            <form className="admin-modal-form" onSubmit={handleSubmit}>
                <div className="product-editor-layout">
                    <div className="product-editor-info">
                    <h3>Thông tin sản phẩm</h3>
                    <div className="admin-modal-form-grid">
                        <div className="admin-modal-field">
                            <label htmlFor="admin-product-name">Tên sản phẩm</label>
                            <input id="admin-product-name" name="name" defaultValue={product?.name} required autoFocus />
                        </div>
                        <div className="admin-modal-field">
                            <label htmlFor="admin-product-brand">Thương hiệu</label>
                            <input id="admin-product-brand" name="brand" defaultValue={product?.brand} />
                        </div>
                        <div className="admin-modal-field">
                            <label htmlFor="admin-product-category">Danh mục</label>
                            <select
                                id="admin-product-category"
                                name="category_id"
                                value={categoryId}
                                onChange={(event) => {
                                    setCategoryId(event.target.value);
                                    if (!isApparelCategory(event.target.value, categories)) setFit("");
                                }}
                                required
                            >
                                <option value="">-- Chọn category --</option>
                                {getProductCategoryOptions(categories).map((category) => (
                                    <option key={category._id} value={category._id}>{category.displayName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-modal-field">
                            <label htmlFor="admin-product-fit">Form dáng</label>
                            <select id="admin-product-fit" name="fit" value={fit} disabled={!isApparel} onChange={(event) => setFit(event.target.value)}>
                                <option value="">{isApparel ? "-- Chọn form dáng --" : "Chỉ áp dụng cho Apparel"}</option>
                                <option value="BOXY_FIT">Boxy Fit</option>
                                <option value="OVERSIZED">Oversized</option>
                                <option value="RELAXED_DROP">Relaxed Drop</option>
                            </select>
                        </div>
                        <div className="admin-modal-field">
                            <label htmlFor="admin-product-cost">Giá gốc (giá nhập)</label>
                            <input id="admin-product-cost" name="original_price" type="number" min="1" step="any" value={cost} onChange={(event) => setCost(event.target.value)} required />
                        </div>
                        <div className="admin-modal-field">
                            <label htmlFor="admin-product-price">Giá bán</label>
                            <input id="admin-product-price" name="price" type="number" min="1" step="any" value={price} onChange={(event) => setPrice(event.target.value)} required />
                        </div>
                        <div className="admin-modal-field">
                            <label htmlFor="admin-product-sport">Môn thể thao</label>
                            <select id="admin-product-sport" name="sport_id" defaultValue={product?.sport_id ?? ""}>
                                <option value="">-- Chọn môn thể thao (tùy chọn) --</option>
                                {sports.map((sport) => (
                                    <option key={sport.id} value={sport.id}>{sport.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-modal-field">
                            <label htmlFor="admin-product-gender">Dành cho</label>
                            <select id="admin-product-gender" name="gender" defaultValue={product?.gender || "Unisex"}>
                                {PRODUCT_GENDERS.map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                        </div>
                        <div className="admin-modal-field">
                            <label htmlFor="admin-product-stock">Lượng hàng hiện có</label>
                            {options.usesVariants ? (
                                <input key="stock-total" id="admin-product-stock" name="stock" type="number" value={options.totalStock} readOnly />
                            ) : (
                                <input key="stock-input" id="admin-product-stock" name="stock" type="number" min="0" defaultValue={product?.stock} />
                            )}
                            {options.usesVariants && <small className="admin-product-form-hint">Tự cộng từ bảng Màu sắc &amp; Kích cỡ.</small>}
                        </div>
                        <div className="admin-modal-field admin-modal-field-full">
                            <label htmlFor="admin-product-images">Ảnh sản phẩm (tối đa {MAX_PRODUCT_IMAGES})</label>
                            <input id="admin-product-images" type="file" accept="image/*" multiple required={!savedProduct} onChange={handleFiles} />
                            <small className="admin-product-form-hint">
                                {files.length
                                    ? `Đã chọn ${files.length}/${MAX_PRODUCT_IMAGES} ảnh.`
                                    : isEdit ? "Chọn ảnh mới sẽ thay toàn bộ ảnh hiện tại." : "Chọn từ 1 đến 5 ảnh từ thiết bị."}
                            </small>
                            {isEdit && files.length === 0 && currentImages.length > 0 && (
                                <div className="admin-product-current-images">
                                    {currentImages.map((url, index) => (
                                        <img key={`${url}-${index}`} src={url} alt={`Ảnh hiện tại ${index + 1}`} />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="admin-modal-field admin-modal-field-full">
                            <label htmlFor="admin-product-description">Mô tả</label>
                            <textarea id="admin-product-description" name="description" rows="3" defaultValue={product?.description} required />
                        </div>
                    </div>
                    </div>
                    <VariantEditor options={options} hasCategory={Boolean(categoryId)} fit={fit} price={price} cost={cost} />
                </div>
                <div className="admin-modal-actions">
                    <button type="button" className="admin-modal-cancel" onClick={onClose}>Hủy</button>
                    <button type="submit" className="admin-modal-submit" disabled={submitting}>
                        {submitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Lưu sản phẩm"}
                    </button>
                </div>
            </form>
        </AdminModal>
    );
}
