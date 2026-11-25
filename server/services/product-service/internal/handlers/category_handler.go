package handlers

import (
	"errors"
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
	ParentID    string `json:"parent_id"`
	IsActive    bool   `json:"is_active"`
}

func respondCategoryError(c *gin.Context, err error, action string) {
	switch {
	case errors.Is(err, services.ErrCategoryNotFound):
		response.NotFound(c, "Không tìm thấy danh mục")
	case errors.Is(err, services.ErrInvalidCategoryParent):
		response.BadRequest(c, "Danh mục cha không hợp lệ", err.Error())
	case errors.Is(err, services.ErrCategoryHasSubcategories):
		response.BadRequest(c, "Hãy chuyển hoặc xóa danh mục con trước khi xóa danh mục cha", err.Error())
	case errors.Is(err, services.ErrCategoryGroupProtected):
		response.BadRequest(c, "Ba nhóm cha Apparel, Footwear và Accessories là cố định", err.Error())
	default:
		response.InternalError(c, action+": "+err.Error())
	}
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

	cat, err := h.service.CreateCategory(req.Name, req.Description, req.ParentID, req.IsActive)
	if err != nil {
		respondCategoryError(c, err, "Lỗi khi tạo category")
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

	cat, err := h.service.UpdateCategory(id, req.Name, req.Description, req.ParentID, req.IsActive)
	if err != nil {
		respondCategoryError(c, err, "Lỗi khi cập nhật category")
		return
	}
	response.Success(c, http.StatusOK, "Cập nhật category thành công", cat)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteCategory(id); err != nil {
		respondCategoryError(c, err, "Lỗi khi xóa category")
		return
	}
	response.Success(c, http.StatusOK, "Xóa category thành công", nil)
}
