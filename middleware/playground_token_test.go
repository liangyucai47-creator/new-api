package middleware

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupPlaygroundTokenContextTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	gin.SetMode(gin.TestMode)
	common.UsingSQLite = true
	common.UsingMySQL = false
	common.UsingPostgreSQL = false
	common.RedisEnabled = false

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)

	model.DB = db
	model.LOG_DB = db

	err = db.AutoMigrate(&model.User{}, &model.Token{})
	require.NoError(t, err)

	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return db
}

func seedPlaygroundUser(t *testing.T, db *gorm.DB, userID int, group string) {
	t.Helper()

	user := &model.User{
		Id:          userID,
		Username:    fmt.Sprintf("user-%d", userID),
		Password:    "password123",
		DisplayName: fmt.Sprintf("User %d", userID),
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       group,
		AffCode:     fmt.Sprintf("aff-%d", userID),
	}
	require.NoError(t, db.Create(user).Error)
}

func seedPlaygroundTokenContextToken(t *testing.T, db *gorm.DB, userID int, name string, modelLimits string, enabled bool) *model.Token {
	t.Helper()

	token := &model.Token{
		UserId:             userID,
		Key:                fmt.Sprintf("playground-token-%d-%s", userID, name),
		Name:               name,
		Status:             common.TokenStatusEnabled,
		CreatedTime:        1,
		AccessedTime:       1,
		ExpiredTime:        -1,
		RemainQuota:        100,
		UnlimitedQuota:     true,
		Group:              "default",
		ModelLimitsEnabled: enabled,
		ModelLimits:        modelLimits,
	}
	require.NoError(t, db.Create(token).Error)
	return token
}

func TestPlaygroundTokenContextAcceptsOwnedToken(t *testing.T) {
	db := setupPlaygroundTokenContextTestDB(t)
	seedPlaygroundUser(t, db, 7, "default")
	token := seedPlaygroundTokenContextToken(t, db, 7, "owned", "gpt-4o,deepseek-chat", true)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("id", 7)
		c.Request = httptest.NewRequest(
			http.MethodPost,
			"/pg/chat/completions",
			bytes.NewBufferString(fmt.Sprintf(`{"model":"gpt-4o","token_id":%d}`, token.Id)),
		)
		c.Request.Header.Set("Content-Type", "application/json")
		c.Next()
	})
	router.Use(PlaygroundTokenContext())
	router.POST("/pg/chat/completions", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"token_id": c.GetInt("token_id"),
			"group":    common.GetContextKeyString(c, constant.ContextKeyUsingGroup),
		})
	})

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/pg/chat/completions", nil)
	router.ServeHTTP(recorder, req)

	require.Equal(t, http.StatusOK, recorder.Code)

	var payload struct {
		TokenID int    `json:"token_id"`
		Group   string `json:"group"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, token.Id, payload.TokenID)
	require.Equal(t, "default", payload.Group)
}

func TestPlaygroundTokenContextRejectsForeignToken(t *testing.T) {
	db := setupPlaygroundTokenContextTestDB(t)
	seedPlaygroundUser(t, db, 7, "default")
	seedPlaygroundUser(t, db, 8, "default")
	foreign := seedPlaygroundTokenContextToken(t, db, 8, "foreign", "gpt-4o", true)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("id", 7)
		c.Request = httptest.NewRequest(
			http.MethodPost,
			"/pg/chat/completions",
			bytes.NewBufferString(fmt.Sprintf(`{"model":"gpt-4o","token_id":%d}`, foreign.Id)),
		)
		c.Request.Header.Set("Content-Type", "application/json")
		c.Next()
	})
	router.Use(PlaygroundTokenContext())
	router.POST("/pg/chat/completions", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/pg/chat/completions", nil)
	router.ServeHTTP(recorder, req)

	require.Equal(t, http.StatusForbidden, recorder.Code)
	require.Contains(t, recorder.Body.String(), "error")
}
