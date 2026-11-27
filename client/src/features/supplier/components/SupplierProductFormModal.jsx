import { useState } from "react";
import SupplierModal from "./SupplierModal";
import { uploadImage } from "../../../shared/api/mediaApi";
import {
    createSupplierProduct,
    syncSupplierProductVariants,
    updateSupplierDiscount,
    updateSupplierProduct,
} from "../../../shared/api/marketplaceApi";
import { getProductCategoryOptions, isApparelCategory } from "../../products/utils/categoryHierarchy";
import { getErrorMessage, toast } from "../../../shared/utils/toast";
import VariantEditor from "../../../shared/components/VariantEditor";
import { useProductOptions } from "../../../shared/hooks/useProductOptions";
import { PRODUCT_GENDERS, hasProductChanges } from "../../../shared/utils/productOptions";

const MAX_PRODUCT_IMAGES = 5;
const optionsApi = {
    syncVariants: syncSupplierProductVariants,
    saveDiscount: updateSupplierDiscount,
};

// Form tạo mới (product = null) hoặc sửa sản phẩm của Supplier
export default function SupplierProductFormModal({ product, categories, attributes, onClose, onSaved, onReload }) {
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
                fit: isApparel ? fit : "",
                gender: form.get("gender"),
                description: form.get("description"),
                price: Number(form.get("price")),
                original_price: Number(form.get("original_price") || 0),
                stock: options.usesVariants ? options.totalStock : Number(form.get("stock") || 0),
                image: images[0] || "",
                images,
                category_id: form.get("category_id"),
                sport_id: form.get("sport_id") || "",
            };
            const changed = !target || files.length > 0
                || hasProductChanges(target, payload, !options.usesVariants);
            if (!target) {
                target = await createSupplierProduct(payload);
                if (!target?.id) throw new Error("Không nhận được sản phẩm vừa tạo.");
                setCreatedProduct(target);
            } else if (changed) {
                await updateSupplierProduct(target.id, payload);
            }
            productSaved = changed;
            const { added } = await options.save(target);
            // Đổi thông tin hoặc thêm màu/size mới thì Admin phải duyệt lại
            await onSaved({ needsApproval: changed || added > 0 });
        } catch (err) {
            console.error("Không thể lưu sản phẩm Supplier:", err);
            const reason = getErrorMessage(err, "Không thể lưu sản phẩm.");
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
        <SupplierModal
            title={isEdit ? "Sửa sản phẩm" : "Tạo sản phẩm"}
            eyebrow={isEdit ? `[ PRODUCT // ${product.sku} ]` : "[ PRODUCT // SUBMIT FOR APPROVAL ]"}
            onClose={onClose}
            wide
        >
            <form className="supplier-modal-form" onSubmit={handleSubmit}>
                <div className="product-editor-layout">
                    <div className="product-editor-info">
                    <h3>Thông tin sản phẩm</h3>
                    <div className="supplier-modal-grid">
                        <label>
                            TÊN SẢN PHẨM
                            <input name="name" placeholder="Tên sản phẩm" defaultValue={product?.name} required />
                        </label>
                        <label>
                            DANH MỤC
                            <select
                                name="category_id"
                                value={categoryId}
                                onChange={(event) => {
                                    setCategoryId(event.target.value);
                                    if (!isApparelCategory(event.target.value, categories)) setFit("");
                                }}
                                required
                            >
                                <option value="">Chọn danh mục</option>
                                {getProductCategoryOptions(categories).map((category) => (
                                    <option key={category._id} value={category._id}>{category.displayName}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            FORM DÁNG
                            <select name="fit" value={fit} disabled={!isApparel} onChange={(event) => setFit(event.target.value)}>
                                <option value="">{isApparel ? "Chọn form dáng" : "Chỉ áp dụng cho Apparel"}</option>
                                <option value="BOXY_FIT">Boxy Fit</option>
                                <option value="OVERSIZED">Oversized</option>
                                <option value="RELAXED_DROP">Relaxed Drop</option>
                            </select>
                        </label>
                        <label>
                            GIÁ GỐC (GIÁ NHẬP)
                            <input name="original_price" type="number" min="1" step="any" placeholder="Giá nhập sản phẩm" value={cost} onChange={(event) => setCost(event.target.value)} required />
                        </label>
                        <label>
                            GIÁ BÁN
                            <input name="price" type="number" min="1" step="any" placeholder="Giá bán" value={price} onChange={(event) => setPrice(event.target.value)} required />
                        </label>
                        <label>
                            MÔN THỂ THAO
                            <select name="sport_id" defaultValue={product?.sport_id ?? ""}>
                                <option value="">-- Chọn môn thể thao (tùy chọn) --</option>
                                {sports.map((sport) => (
                                    <option key={sport.id} value={sport.id}>{sport.name}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            DÀNH CHO
                            <select name="gender" defaultValue={product?.gender || "Unisex"}>
                                {PRODUCT_GENDERS.map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                        </label>
                        <label>
                            LƯỢNG HÀNG HIỆN CÓ
                            {options.usesVariants ? (
                                <input key="stock-total" name="stock" type="number" value={options.totalStock} readOnly />
                            ) : (
                                <input key="stock-input" name="stock" type="number" min="0" placeholder="Lượng hàng hiện có" defaultValue={product?.stock} />
                            )}
                            {options.usesVariants && <small>Tự cộng từ bảng Màu sắc &amp; Kích cỡ.</small>}
                        </label>
                        <label>
                            ẢNH SẢN PHẨM (TỐI ĐA {MAX_PRODUCT_IMAGES})
                            <input type="file" accept="image/*" multiple required={!savedProduct} onChange={handleFiles} />
                            <small>
                                {files.length
                                    ? `Đã chọn ${files.length}/${MAX_PRODUCT_IMAGES} ảnh.`
                                    : isEdit
                                        ? "Chọn ảnh mới sẽ thay toàn bộ ảnh hiện tại."
                                        : `Chọn từ 1 đến ${MAX_PRODUCT_IMAGES} ảnh từ thiết bị.`}
                            </small>
                        </label>
                        {isEdit && files.length === 0 && currentImages.length > 0 && (
                            <div className="supplier-current-images supplier-modal-field-full">
                                {currentImages.map((url, index) => (
                                    <img key={`${url}-${index}`} src={url} alt={`Ảnh hiện tại ${index + 1}`} />
                                ))}
                            </div>
                        )}
                        <label className="supplier-modal-field-full">
                            MÔ TẢ
                            <textarea name="description" rows="3" placeholder="Mô tả sản phẩm" defaultValue={product?.description} />
                        </label>
                    </div>
                    </div>
                    <VariantEditor options={options} hasCategory={Boolean(categoryId)} fit={fit} price={price} cost={cost} />
                </div>
                <div className="supplier-modal-actions">
                    <button type="button" className="supplier-secondary-button" onClick={onClose}>HỦY</button>
                    <button type="submit" className="supplier-primary-button" disabled={submitting}>
                        {submitting ? "ĐANG LƯU..." : isEdit ? "LƯU THAY ĐỔI" : "TẠO SẢN PHẨM"}
                    </button>
                </div>
            </form>
        </SupplierModal>
    );
}
