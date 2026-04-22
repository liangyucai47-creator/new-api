package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestForbidInInternalModeBlocksRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalInternalMode := common.InternalModeEnabled
	t.Cleanup(func() {
		common.InternalModeEnabled = originalInternalMode
	})

	common.InternalModeEnabled = true

	router := gin.New()
	router.GET("/blocked", ForbidInInternalMode("blocked in internal mode"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/blocked", nil)
	router.ServeHTTP(recorder, req)

	require.Equal(t, http.StatusForbidden, recorder.Code)

	var response struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	err := common.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)
	require.False(t, response.Success)
	require.Equal(t, "blocked in internal mode", response.Message)
}

func TestForbidInInternalModePassesThroughWhenDisabled(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalInternalMode := common.InternalModeEnabled
	t.Cleanup(func() {
		common.InternalModeEnabled = originalInternalMode
	})

	common.InternalModeEnabled = false

	router := gin.New()
	router.GET("/allowed", ForbidInInternalMode("blocked in internal mode"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/allowed", nil)
	router.ServeHTTP(recorder, req)

	require.Equal(t, http.StatusOK, recorder.Code)
}
