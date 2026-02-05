package main

import (
	"log"
	"net/http"
	"os"
	"time"
)

// CORS middleware
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get allowed origin from environment or allow all
		allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
		if allowedOrigin == "" {
			allowedOrigin = "*"
		}
		
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

// cleanupWorker runs periodically to clean up expired shares
func cleanupWorker(store *ShareStore, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		count := store.CleanupExpired()
		if count > 0 {
			log.Printf("Cleaned up %d expired shares", count)
		}
	}
}

func main() {
	// Initialize share store
	store := NewShareStore()

	// Start cleanup worker (runs every 10 minutes)
	go cleanupWorker(store, 10*time.Minute)

	// Get configuration from environment or use defaults
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}

	// Setup API routes
	http.HandleFunc("/api/health", corsMiddleware(HealthHandler))
	http.HandleFunc("/api/share", corsMiddleware(CreateShareHandler(store, baseURL)))
	http.HandleFunc("/api/share/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			GetShareHandler(store)(w, r)
		case http.MethodDelete:
			DeleteShareHandler(store)(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	// Serve static files from frontend directory
	// Try both relative paths (for local) and absolute (for production)
	frontendPath := "../frontend"
	if _, err := os.Stat(frontendPath); os.IsNotExist(err) {
		frontendPath = "./frontend"
	}
	if _, err := os.Stat(frontendPath); os.IsNotExist(err) {
		frontendPath = "/app/frontend"
	}

	fs := http.FileServer(http.Dir(frontendPath))
	http.Handle("/", fs)

	log.Printf("🔐 Password Manager Server starting on port %s", port)
	log.Printf("📍 Base URL: %s", baseURL)
	log.Printf("📁 Frontend path: %s", frontendPath)
	log.Printf("🔧 API Health: http://localhost:%s/api/health", port)
	
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
