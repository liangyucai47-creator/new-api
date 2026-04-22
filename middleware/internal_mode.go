package middleware

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

const defaultInternalModeBlockedMessage = "internal mode disables this endpoint"

func ForbidInInternalMode(message string) gin.HandlerFunc {
	if message == "" {
		message = defaultInternalModeBlockedMessage
	}

	return func(c *gin.Context) {
		if !common.InternalModeEnabled {
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": message,
		})
		c.Abort()
	}
}
