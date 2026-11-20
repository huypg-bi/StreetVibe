package handlers

import (
	"net/http"

	"streetvibe/customer-service/internal/services"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

type ReviewHandler struct {
	service services.ReviewService
}

func NewReviewHandler(service services.ReviewService) *ReviewHandler {
	return &ReviewHandler{service: service}
}

func (h *ReviewHandler) GetProductReviews(c *gin.Context) {
	productID := c.Param("id")
	reviews, err := h.service.GetProductReviews(productID)
	if err != nil {
		response.InternalError(c, "Không thể lấy đánh giá: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Lấy danh sách đánh giá thành công", reviews)
}

func (h *ReviewHandler) AddOrUpdateReview(c *gin.Context) {
	userID := c.GetString("user_id")
	userName := c.GetString("user_name")
	productID := c.Param("id")

	var dto services.AddReviewDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		response.BadRequest(c, "Dữ liệu đánh giá không hợp lệ", err.Error())
		return
	}

	review, err := h.service.AddOrUpdateReview(userID, userName, productID, &dto)
	if err != nil {
		response.InternalError(c, "Lỗi khi gửi đánh giá: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Gửi đánh giá thành công", review)
}
