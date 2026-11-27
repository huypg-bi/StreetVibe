// Package aiclient gọi AI Service. Mọi lỗi trả về cho nơi gọi tự dùng kết quả dự phòng.
package aiclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"streetvibe/shared/aiapi"
	"streetvibe/shared/internalauth"
)

const (
	checkTimeout = 3 * time.Second
	// AI Service thử tối đa 2 model, mỗi lần 8 giây; trình duyệt chờ 20 giây
	chooseTimeout = 18 * time.Second
)

type Client struct {
	baseURL string
	secret  string
	http    *http.Client
}

func New(baseURL, secret string) *Client {
	return &Client{baseURL: strings.TrimRight(baseURL, "/"), secret: secret, http: &http.Client{}}
}

func (c *Client) CheckOutfit(ctx context.Context, req aiapi.OutfitCheckRequest) (aiapi.OutfitCheckResponse, error) {
	var result aiapi.OutfitCheckResponse
	err := c.post(ctx, aiapi.OutfitCheckPath, checkTimeout, req, &result)
	return result, err
}

func (c *Client) ChooseOutfit(ctx context.Context, req aiapi.OutfitChooseRequest) (aiapi.OutfitChooseResponse, error) {
	var result aiapi.OutfitChooseResponse
	err := c.post(ctx, aiapi.OutfitChoosePath, chooseTimeout, req, &result)
	return result, err
}

func (c *Client) post(ctx context.Context, path string, timeout time.Duration, body, result any) error {
	raw, err := json.Marshal(body)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(raw))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	internalauth.Set(request, c.secret)

	res, err := c.http.Do(request)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		detail, _ := io.ReadAll(io.LimitReader(res.Body, 300))
		return fmt.Errorf("AI Service trả mã %d: %s", res.StatusCode, detail)
	}
	envelope := struct {
		Data any `json:"data"`
	}{Data: result}
	return json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&envelope)
}
