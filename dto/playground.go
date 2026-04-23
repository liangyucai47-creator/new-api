package dto

type PlayGroundRequest struct {
	Model   string `json:"model,omitempty"`
	Group   string `json:"group,omitempty"`
	TokenID int    `json:"token_id,omitempty"`
}
