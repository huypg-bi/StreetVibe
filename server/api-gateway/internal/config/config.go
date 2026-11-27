package config

import (
	"os"
)

type Config struct {
	Port               string
	JWTSecret          string
	AuthServiceURL     string
	ProductServiceURL  string
	CustomerServiceURL string
	MediaServiceURL    string
	AIServiceURL       string
	AllowedOrigins     string
}

func getEnv(key string, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func LoadConfig() *Config {
	return &Config{
		Port:               getEnv("PORT", "8080"),
		JWTSecret:          getEnv("JWT_SECRET", "super-secret-streetvibe-jwt-key-2026"),
		AuthServiceURL:     getEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
		ProductServiceURL:  getEnv("PRODUCT_SERVICE_URL", "http://localhost:8082"),
		CustomerServiceURL: getEnv("CUSTOMER_SERVICE_URL", "http://localhost:8083"),
		MediaServiceURL:    getEnv("MEDIA_SERVICE_URL", "http://localhost:8084"),
		AIServiceURL:       getEnv("AI_SERVICE_URL", "http://localhost:8085"),
		AllowedOrigins:     getEnv("ALLOWED_ORIGINS", "*"),
	}
}
