package llm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"streetvibe/shared/aiapi"
)

func TestStylist(t *testing.T) {
	candidates := []aiapi.Candidate{{Items: []aiapi.Item{{Slot: "top", Name: "Áo", Color: "Đen"}}}}
	good := `{"choices":[{"message":{"content":"{\"choice\":1,\"reason\":\"Hợp màu\"}"}}],"usage":{"prompt_tokens":10,"completion_tokens":5,"queue_time":0.1,"prompt_tokens_details":{"cached_tokens":4}}}`
	var seen []string
	replies := map[string]func(w http.ResponseWriter){}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Model string `json:"model"`
		}
		json.NewDecoder(r.Body).Decode(&body)
		seen = append(seen, body.Model)
		replies[body.Model](w)
	}))
	defer server.Close()

	stylist := NewStylist("test-key")
	stylist.url = server.URL
	input := Input{Gender: "Nam", Candidates: candidates, SystemPrompt: "p1", Models: []string{"chinh", "duphong"}}

	// Model chính quá tải thì chuyển sang dự phòng
	replies["chinh"] = func(w http.ResponseWriter) { w.WriteHeader(429) }
	replies["duphong"] = func(w http.ResponseWriter) { w.Write([]byte(good)) }
	choice, err := stylist.Choose(context.Background(), input)
	if err != nil || choice.Model != "duphong" || len(choice.Attempts) != 2 || choice.Attempts[0].Outcome != OutcomeRateLimit {
		t.Fatalf("dự phòng sai: %+v %v", choice, err)
	}
	usage := choice.Attempts[1].Usage
	if usage.PromptTokens != 10 || usage.CachedTokens != 4 || usage.QueueMs != 100 {
		t.Fatalf("đọc usage sai: %+v", usage)
	}
	if cached, ok := stylist.Cached(input); !ok || !cached.CacheHit || cached.Reason != "Hợp màu" {
		t.Fatal("phải có trong cache")
	}
	input.SystemPrompt = "p2"
	if _, ok := stylist.Cached(input); ok {
		t.Fatal("đổi prompt thì không dùng cache cũ")
	}

	// Cả hai trả sai định dạng: dừng sau đúng 2 lần
	bad := func(w http.ResponseWriter) {
		w.Write([]byte(`{"choices":[{"message":{"content":"{\"choice\":99,\"reason\":\"x\"}"}}]}`))
	}
	replies["chinh"], replies["duphong"], seen = bad, bad, nil
	choice, err = stylist.Choose(context.Background(), input)
	if err == nil || len(seen) != 2 || choice.Attempts[1].Outcome != OutcomeInvalid {
		t.Fatalf("phải thất bại sau 2 lần: %v %v", err, seen)
	}

	// Sai key thì không thử model khác
	replies["chinh"], seen = func(w http.ResponseWriter) { w.WriteHeader(401) }, nil
	if _, err := stylist.Choose(context.Background(), input); err == nil || len(seen) != 1 {
		t.Fatalf("sai key chỉ gọi một lần: %v", seen)
	}
	if _, err := NewStylist("").Choose(context.Background(), input); err != ErrStylistDisabled {
		t.Fatalf("thiếu key: %v", err)
	}
}
