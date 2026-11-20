package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorPayload struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

type APIResponse struct {
	Success bool          `json:"success"`
	Message string        `json:"message,omitempty"`
	Data    interface{}   `json:"data,omitempty"`
	Error   *ErrorPayload `json:"error,omitempty"`
}

func Success(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func Error(c *gin.Context, statusCode int, code string, message string, details ...interface{}) {
	var detail interface{}
	if len(details) > 0 {
		detail = details[0]
	}

	c.JSON(statusCode, APIResponse{
		Success: false,
		Error: &ErrorPayload{
			Code:    code,
			Message: message,
			Details: detail,
		},
	})
}

func InternalError(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", message)
}

func BadRequest(c *gin.Context, message string, details ...interface{}) {
	Error(c, http.StatusBadRequest, "BAD_REQUEST", message, details...)
}

func NotFound(c *gin.Context, message string) {
	Error(c, http.StatusNotFound, "NOT_FOUND", message)
}

func Unauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func Forbidden(c *gin.Context, message string) {
	Error(c, http.StatusForbidden, "FORBIDDEN", message)
}
