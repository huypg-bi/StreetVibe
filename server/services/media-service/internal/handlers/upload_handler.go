package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"streetvibe/media-service/internal/config"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UploadHandler struct {
	cfg *config.Config
}

func NewUploadHandler(cfg *config.Config) *UploadHandler {
	// Ensure upload directory exists
	if err := os.MkdirAll(cfg.UploadDir, 0755); err != nil {
		fmt.Printf("Warning: Could not create upload directory: %v\n", err)
	}
	return &UploadHandler{cfg: cfg}
}

var allowedExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
	".gif":  true,
}

func (h *UploadHandler) UploadSingle(c *gin.Context) {
	// Support both "image" and "file" field name
	file, err := c.FormFile("image")
	if err != nil {
		file, err = c.FormFile("file")
	}
	if err != nil {
		response.BadRequest(c, "Không tìm thấy file hình ảnh trong form-data ('image' hoặc 'file')")
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedExtensions[ext] {
		response.BadRequest(c, "Định dạng file không hỗ trợ. Chỉ chấp nhận jpg, jpeg, png, webp, gif")
		return
	}

	// Max 10MB
	if file.Size > 10*1024*1024 {
		response.BadRequest(c, "Dung lượng ảnh vượt quá giới hạn 10MB")
		return
	}

	fileName := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), uuid.New().String()[:8], ext)
	dst := filepath.Join(h.cfg.UploadDir, fileName)

	if err := c.SaveUploadedFile(file, dst); err != nil {
		response.InternalError(c, "Lỗi khi lưu trữ file: "+err.Error())
		return
	}

	publicURL := fmt.Sprintf("%s/uploads/%s", h.cfg.PublicBaseURL, fileName)
	response.Success(c, http.StatusOK, "Upload ảnh thành công", gin.H{
		"url":       publicURL,
		"file_name": fileName,
	})
}

func (h *UploadHandler) UploadMultiple(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		response.BadRequest(c, "Dữ liệu multipart form không hợp lệ")
		return
	}

	files := form.File["images"]
	if len(files) == 0 {
		files = form.File["files"]
	}
	if len(files) == 0 {
		response.BadRequest(c, "Không tìm thấy danh sách file trong 'images'")
		return
	}

	if len(files) > 10 {
		response.BadRequest(c, "Chỉ được upload tối đa 10 ảnh cùng lúc")
		return
	}

	var urls []string
	for _, file := range files {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if !allowedExtensions[ext] {
			continue
		}
		if file.Size > 10*1024*1024 {
			continue
		}

		fileName := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), uuid.New().String()[:8], ext)
		dst := filepath.Join(h.cfg.UploadDir, fileName)

		if err := c.SaveUploadedFile(file, dst); err == nil {
			urls = append(urls, fmt.Sprintf("%s/uploads/%s", h.cfg.PublicBaseURL, fileName))
		}
	}

	response.Success(c, http.StatusOK, "Upload danh sách ảnh thành công", gin.H{
		"urls":  urls,
		"count": len(urls),
	})
}
