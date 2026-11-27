package config

import (
	"os"
)

type Config struct {
	Port         string
	DBHost       string
	DBPort       string
	DBUser       string
	DBPassword   string
	DBName       string
	DBSSLMode    string
	JWTSecret    string
	Environment  string
	AIServiceURL string
}

func getEnv(key string, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func LoadConfig() *Config {
	return &Config{
		Port:         getEnv("PORT", "8082"),
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBPort:       getEnv("DB_PORT", "5432"),
		DBUser:       getEnv("DB_USER", "postgres"),
		DBPassword:   getEnv("DB_PASSWORD", "postgrespassword"),
		DBName:       getEnv("DB_NAME", "product_db"),
		DBSSLMode:    getEnv("DB_SSLMODE", "disable"),
		JWTSecret:    getEnv("JWT_SECRET", "super-secret-streetvibe-jwt-key-2026"),
		Environment:  getEnv("ENV", "development"),
		AIServiceURL: getEnv("AI_SERVICE_URL", "http://localhost:8085"),
	}
}
