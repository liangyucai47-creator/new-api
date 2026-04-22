package middleware

import (
	"errors"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func PlaygroundTokenContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		request := &dto.PlayGroundRequest{}
		if err := common.UnmarshalBodyReusable(c, request); err != nil {
			abortWithOpenAiMessage(c, http.StatusBadRequest, "invalid playground request")
			return
		}
		if request.TokenID == 0 {
			c.Next()
			return
		}

		userID := c.GetInt("id")
		token, err := model.GetTokenByIds(request.TokenID, userID)
		if err != nil {
			statusCode := http.StatusForbidden
			message := common.TranslateMessage(c, i18n.MsgTokenInvalid)
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				statusCode = http.StatusInternalServerError
				message = common.TranslateMessage(c, i18n.MsgDatabaseError)
			}
			abortWithOpenAiMessage(c, statusCode, message)
			return
		}

		userCache, err := model.GetUserCache(userID)
		if err != nil {
			abortWithOpenAiMessage(c, http.StatusInternalServerError, common.TranslateMessage(c, i18n.MsgDatabaseError))
			return
		}
		userCache.WriteContext(c)

		usingGroup := userCache.Group
		if token.Group != "" {
			usingGroup = token.Group
		}
		common.SetContextKey(c, constant.ContextKeyUsingGroup, usingGroup)

		if err = SetupContextForToken(c, token); err != nil {
			return
		}
		c.Next()
	}
}
