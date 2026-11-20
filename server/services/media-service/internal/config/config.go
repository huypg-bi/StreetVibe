package config

import (
	"os"
)

type Config struct {
	Port         string
	UploadDir    string
	PublicBaseURL string
	JWTSecret    string
	Environment  string
}

func getEnv(key string, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func LoadConfig() *Config {
	return &Config{
		Port:          getEnv("PORT", "8084"),
		UploadDir:     getEnv("UPLOAD_DIR", "./uploads"),
		PublicBaseURL: getEnv("PUBLIC_BASE_URL", "http://localhost:8080"),
		JWTSecret:     getEnv("JWT_SECRET", "super-secret-streetvibe-jwt-key-2026"),
		Environment:   getEnv("ENV", "development"),
	}
}
