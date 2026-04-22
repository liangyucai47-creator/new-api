package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetStatusIncludesInternalModeFlag(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalInternalMode := common.InternalModeEnabled
	originalOptionMap := common.OptionMap
	t.Cleanup(func() {
		common.InternalModeEnabled = originalInternalMode
		common.OptionMap = originalOptionMap
	})

	common.InternalModeEnabled = true
	common.OptionMap = map[string]string{}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)

	GetStatus(c)

	require.Equal(t, http.StatusOK, recorder.Code)

	var response struct {
		Success bool `json:"success"`
		Data    struct {
			InternalModeEnabled bool `json:"internal_mode_enabled"`
		} `json:"data"`
	}
	err := common.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)
	require.True(t, response.Success)
	require.True(t, response.Data.InternalModeEnabled)
}
