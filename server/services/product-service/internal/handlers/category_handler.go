package handlers

import (
	"net/http"

	"streetvibe/product-service/internal/services"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

type CategoryHandler struct {
	service services.CategoryService
}

func NewCategoryHandler(service services.CategoryService) *CategoryHandler {
	return &CategoryHandler{service: service}
}

type CreateCategoryRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
}

func (h *CategoryHandler) GetList(c *gin.Context) {
	onlyActive := c.DefaultQuery("only_active", "false") == "true"
	categories, err := h.service.GetCategories(onlyActive)
	if err != nil {
		response.InternalError(c, "Không thể lấy danh sách category")
		return
	}
	response.Success(c, http.StatusOK, "Lấy danh sách danh mục thành công", categories)
}

func (h *CategoryHandler) GetDetail(c *gin.Context) {
	id := c.Param("id")
	cat, err := h.service.GetCategoryByID(id)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Lấy chi tiết danh mục thành công", cat)
}

func (h *CategoryHandler) Create(c *gin.Context) {
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu tạo category không hợp lệ", err.Error())
		return
	}

	cat, err := h.service.CreateCategory(req.Name, req.Description, req.IsActive)
	if err != nil {
		response.InternalError(c, "Lỗi khi tạo category: "+err.Error())
		return
	}
	response.Success(c, http.StatusCreated, "Tạo category thành công", cat)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu cập nhật category không hợp lệ", err.Error())
		return
	}

	cat, err := h.service.UpdateCategory(id, req.Name, req.Description, req.IsActive)
	if err != nil {
		response.InternalError(c, "Lỗi khi cập nhật category: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Cập nhật category thành công", cat)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteCategory(id); err != nil {
		response.InternalError(c, "Lỗi khi xóa category: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Xóa category thành công", nil)
}
