package config

import (
	"os"
)

type Config struct {
	Port                 string
	DBHost               string
	DBPort               string
	DBUser               string
	DBPassword           string
	DBName               string
	DBSSLMode            string
	JWTSecret            string
	Environment          string
	ProductServiceURL    string
	InternalServiceToken string
}

func getEnv(key string, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func LoadConfig() *Config {
	return &Config{
		Port:                 getEnv("PORT", "8083"),
		DBHost:               getEnv("DB_HOST", "localhost"),
		DBPort:               getEnv("DB_PORT", "5432"),
		DBUser:               getEnv("DB_USER", "postgres"),
		DBPassword:           getEnv("DB_PASSWORD", "postgrespassword"),
		DBName:               getEnv("DB_NAME", "customer_db"),
		DBSSLMode:            getEnv("DB_SSLMODE", "disable"),
		JWTSecret:            getEnv("JWT_SECRET", "super-secret-streetvibe-jwt-key-2026"),
		Environment:          getEnv("ENV", "development"),
		ProductServiceURL:    getEnv("PRODUCT_SERVICE_URL", "http://product-service:8082"),
		InternalServiceToken: getEnv("JWT_SECRET", "super-secret-streetvibe-jwt-key-2026"),
	}
}
