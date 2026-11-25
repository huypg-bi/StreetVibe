package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"streetvibe/product-service/internal/repositories"
	"streetvibe/product-service/internal/services"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

type ProductHandler struct {
	service services.ProductService
}

func NewProductHandler(service services.ProductService) *ProductHandler {
	return &ProductHandler{service: service}
}

func (h *ProductHandler) GetList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))

	var isFeatured *bool
	if fStr := c.Query("is_featured"); fStr != "" {
		val := fStr == "true"
		isFeatured = &val
	}
	var inStock *bool
	if stockFilter := c.Query("in_stock"); stockFilter != "" {
		val := stockFilter == "true"
		inStock = &val
	}

	var minPrice, maxPrice *float64
	if minStr := c.Query("min_price"); minStr != "" {
		if val, err := strconv.ParseFloat(minStr, 64); err == nil {
			minPrice = &val
		}
	}
	if maxStr := c.Query("max_price"); maxStr != "" {
		if val, err := strconv.ParseFloat(maxStr, 64); err == nil {
			maxPrice = &val
		}
	}

	filter := repositories.ProductFilter{
		CategoryID: c.Query("category_id"),
		Fit:        c.Query("fit"),
		Size:       c.Query("size"),
		Brand:      c.Query("brand"),
		IsFeatured: isFeatured,
		MinPrice:   minPrice,
		MaxPrice:   maxPrice,
		Search:     c.Query("search"),
		Sort:       c.Query("sort"),
		InStock:    inStock,
		Page:       page,
		Limit:      limit,
	}

	result, err := h.service.GetProducts(filter)
	if err != nil {
		response.InternalError(c, "Lỗi khi lấy danh sách sản phẩm: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Lấy danh sách sản phẩm thành công", result)
}

func (h *ProductHandler) GetBrands(c *gin.Context) {
	brands, err := h.service.GetApprovedBrands()
	if err != nil {
		response.InternalError(c, "Lỗi khi lấy danh sách thương hiệu")
		return
	}
	response.Success(c, http.StatusOK, "Lấy danh sách thương hiệu thành công", gin.H{
		"items": brands,
	})
}

func (h *ProductHandler) GetDetail(c *gin.Context) {
	id := c.Param("id")
	product, err := h.service.GetProductByID(id)
	if err != nil {
		response.NotFound(c, "Không tìm thấy sản phẩm")
		return
	}
	response.Success(c, http.StatusOK, "Lấy chi tiết sản phẩm thành công", product)
}

func (h *ProductHandler) GetFeatured(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "8"))
	products, err := h.service.GetFeaturedProducts(limit)
	if err != nil {
		response.InternalError(c, "Lỗi khi lấy sản phẩm nổi bật")
		return
	}
	response.Success(c, http.StatusOK, "Lấy sản phẩm nổi bật thành công", gin.H{
		"items": products,
		"count": len(products),
	})
}

func (h *ProductHandler) GetBestSellers(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "8"))
	categorySlug := c.DefaultQuery("categorySlug", "all")
	products, err := h.service.GetBestSellers(categorySlug, limit)
	if err != nil {
		response.InternalError(c, "Lỗi khi lấy sản phẩm bán chạy")
		return
	}
	response.Success(c, http.StatusOK, "Lấy sản phẩm bán chạy thành công", gin.H{
		"items": products,
		"count": len(products),
	})
}

func (h *ProductHandler) Create(c *gin.Context) {
	var dto services.ProductDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		response.BadRequest(c, "Dữ liệu tạo sản phẩm không hợp lệ", err.Error())
		return
	}

	product, err := h.service.CreateProduct(&dto)
	if err != nil {
		if errors.Is(err, services.ErrInvalidProductColor) {
			response.BadRequest(c, "Mã màu không hợp lệ", err.Error())
			return
		}
		response.InternalError(c, "Lỗi khi tạo sản phẩm: "+err.Error())
		return
	}
	response.Success(c, http.StatusCreated, "Tạo sản phẩm thành công", product)
}

func (h *ProductHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var dto services.ProductDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		response.BadRequest(c, "Dữ liệu cập nhật sản phẩm không hợp lệ", err.Error())
		return
	}

	product, err := h.service.UpdateProduct(id, &dto)
	if err != nil {
		if errors.Is(err, services.ErrInvalidProductColor) {
			response.BadRequest(c, "Mã màu không hợp lệ", err.Error())
			return
		}
		response.InternalError(c, "Lỗi khi cập nhật sản phẩm: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Cập nhật sản phẩm thành công", product)
}

type PatchFlagRequest struct {
	IsFeatured bool `json:"is_featured"`
}

func (h *ProductHandler) PatchFlags(c *gin.Context) {
	id := c.Param("id")
	var req PatchFlagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu flag không hợp lệ", err.Error())
		return
	}

	if err := h.service.PatchProductFlags(id, req.IsFeatured); err != nil {
		response.InternalError(c, "Lỗi cập nhật cờ sản phẩm: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Cập nhật cờ sản phẩm thành công", gin.H{
		"is_featured": req.IsFeatured,
	})
}

func (h *ProductHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteProduct(id); err != nil {
		response.InternalError(c, "Lỗi khi xóa sản phẩm: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Xóa sản phẩm thành công", nil)
}
