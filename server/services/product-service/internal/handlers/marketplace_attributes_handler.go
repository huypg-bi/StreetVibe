package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"streetvibe/product-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func (h *MarketplaceHandler) ListAttributes(c *gin.Context) {
	var sizes []models.Size
	var colors []models.Color
	var sports []models.Sport
	h.db.Order("size_type asc, name asc").Find(&sizes)
	h.db.Order("name asc").Find(&colors)
	h.db.Order("name asc").Find(&sports)
	response.Success(c, http.StatusOK, "Lấy thuộc tính thành công", gin.H{
		"sizes":  sizes,
		"colors": colors,
		"sports": sports,
	})
}

func (h *MarketplaceHandler) CreateSize(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var req struct {
		Name     string `json:"name" binding:"required"`
		SizeType string `json:"size_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Tên size không hợp lệ", err.Error())
		return
	}
	sizeType := strings.ToLower(strings.TrimSpace(req.SizeType))
	if sizeType != "footwear" && sizeType != "apparel" {
		if num, err := strconv.Atoi(strings.TrimSpace(req.Name)); err == nil && num >= 35 && num <= 48 {
			sizeType = "footwear"
		} else {
			sizeType = "apparel"
		}
	}
	item := models.Size{Name: strings.TrimSpace(req.Name), SizeType: sizeType}
	var existing models.Size
	err := h.db.Unscoped().Where("LOWER(name) = LOWER(?)", item.Name).
		Order("deleted_at IS NOT NULL").First(&existing).Error
	switch {
	case err == nil && !existing.DeletedAt.Valid:
		response.Error(c, http.StatusConflict, "CONFLICT", "Size "+existing.Name+" đã tồn tại")
		return
	case err == nil:
		// Size đã xóa vẫn giữ tên (unique index): khôi phục để biến thể cũ liên kết lại
		if err := h.db.Unscoped().Model(&existing).Updates(map[string]interface{}{
			"name": item.Name, "size_type": item.SizeType, "deleted_at": nil,
		}).Error; err != nil {
			response.InternalError(c, "Không thể khôi phục size")
			return
		}
		existing.Name, existing.SizeType, existing.DeletedAt = item.Name, item.SizeType, gorm.DeletedAt{}
		response.Success(c, http.StatusCreated, "Đã khôi phục size", existing)
		return
	case !errors.Is(err, gorm.ErrRecordNotFound):
		response.InternalError(c, "Không thể kiểm tra size")
		return
	}
	if err := h.db.Create(&item).Error; err != nil {
		response.InternalError(c, "Không thể tạo size")
		return
	}
	response.Success(c, http.StatusCreated, "Tạo size thành công", item)
}

func (h *MarketplaceHandler) UpdateSize(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var item models.Size
	if err := h.db.First(&item, "id = ?", c.Param("id")).Error; err != nil {
		response.NotFound(c, "Không tìm thấy size")
		return
	}
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Tên size không hợp lệ", err.Error())
		return
	}
	item.Name = req.Name
	if err := h.db.Save(&item).Error; err != nil {
		response.InternalError(c, "Không thể cập nhật size")
		return
	}
	response.Success(c, http.StatusOK, "Cập nhật size thành công", item)
}

func (h *MarketplaceHandler) DeleteSize(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	if err := h.db.Delete(&models.Size{}, "id = ?", c.Param("id")).Error; err != nil {
		response.InternalError(c, "Không thể xóa size")
		return
	}
	response.Success(c, http.StatusOK, "Xóa size thành công", nil)
}

func (h *MarketplaceHandler) CreateColor(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var req struct {
		Name    string `json:"name" binding:"required"`
		HexCode string `json:"hex_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Màu không hợp lệ", err.Error())
		return
	}
	item := models.Color{Name: req.Name, HexCode: req.HexCode}
	if err := h.db.Create(&item).Error; err != nil {
		response.InternalError(c, "Không thể tạo màu")
		return
	}
	response.Success(c, http.StatusCreated, "Tạo màu thành công", item)
}

func (h *MarketplaceHandler) UpdateColor(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var item models.Color
	if err := h.db.First(&item, "id = ?", c.Param("id")).Error; err != nil {
		response.NotFound(c, "Không tìm thấy màu")
		return
	}
	var req struct {
		Name    string `json:"name" binding:"required"`
		HexCode string `json:"hex_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Màu không hợp lệ", err.Error())
		return
	}
	item.Name, item.HexCode = req.Name, req.HexCode
	h.db.Save(&item)
	response.Success(c, http.StatusOK, "Cập nhật màu thành công", item)
}

func (h *MarketplaceHandler) DeleteColor(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	h.db.Delete(&models.Color{}, "id = ?", c.Param("id"))
	response.Success(c, http.StatusOK, "Xóa màu thành công", nil)
}

func makeSportSlug(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	replacer := strings.NewReplacer(
		" ", "-", "á", "a", "à", "a", "ả", "a", "ã", "a", "ạ", "a",
		"ă", "a", "ắ", "a", "ằ", "a", "ẳ", "a", "ẵ", "a", "ặ", "a",
		"â", "a", "ấ", "a", "ầ", "a", "ẩ", "a", "ẫ", "a", "ậ", "a",
		"đ", "d", "é", "e", "è", "e", "ẻ", "e", "ẽ", "e", "ẹ", "e",
		"ê", "e", "ế", "e", "ề", "e", "ể", "e", "ễ", "e", "ệ", "e",
		"í", "i", "ì", "i", "ỉ", "i", "ĩ", "i", "ị", "i",
		"ó", "o", "ò", "o", "ỏ", "o", "õ", "o", "ọ", "o",
		"ô", "o", "ố", "o", "ồ", "o", "ổ", "o", "ỗ", "o", "ộ", "o",
		"ơ", "o", "ớ", "o", "ờ", "o", "ở", "o", "ỡ", "o", "ợ", "o",
		"ú", "u", "ù", "u", "ủ", "u", "ũ", "u", "ụ", "u",
		"ư", "u", "ứ", "u", "ừ", "u", "ử", "u", "ữ", "u", "ự", "u",
		"ý", "y", "ỳ", "y", "ỷ", "y", "ỹ", "y", "ỵ", "y",
	)
	return replacer.Replace(s)
}

func (h *MarketplaceHandler) CreateSport(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Tên môn thể thao không hợp lệ", err.Error())
		return
	}
	name := strings.TrimSpace(req.Name)
	item := models.Sport{Name: name, Slug: makeSportSlug(name)}
	var existing models.Sport
	err := h.db.Unscoped().Where("slug = ? OR LOWER(name) = LOWER(?)", item.Slug, item.Name).
		Order("deleted_at IS NOT NULL").First(&existing).Error
	switch {
	case err == nil && !existing.DeletedAt.Valid:
		response.Error(c, http.StatusConflict, "CONFLICT", "Môn thể thao "+existing.Name+" đã tồn tại")
		return
	case err == nil:
		// Tương tự size: khôi phục để sản phẩm cũ vẫn thuộc đúng môn
		if err := h.db.Unscoped().Model(&existing).Updates(map[string]interface{}{
			"name": item.Name, "slug": item.Slug, "deleted_at": nil,
		}).Error; err != nil {
			response.InternalError(c, "Không thể khôi phục môn thể thao")
			return
		}
		existing.Name, existing.Slug, existing.DeletedAt = item.Name, item.Slug, gorm.DeletedAt{}
		response.Success(c, http.StatusCreated, "Đã khôi phục môn thể thao", existing)
		return
	case !errors.Is(err, gorm.ErrRecordNotFound):
		response.InternalError(c, "Không thể kiểm tra môn thể thao")
		return
	}
	if err := h.db.Create(&item).Error; err != nil {
		response.InternalError(c, "Không thể tạo môn thể thao")
		return
	}
	response.Success(c, http.StatusCreated, "Tạo môn thể thao thành công", item)
}

func (h *MarketplaceHandler) DeleteSport(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	if err := h.db.Delete(&models.Sport{}, "id = ?", c.Param("id")).Error; err != nil {
		response.InternalError(c, "Không thể xóa môn thể thao")
		return
	}
	response.Success(c, http.StatusOK, "Xóa môn thể thao thành công", nil)
}
