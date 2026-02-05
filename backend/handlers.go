package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

// generateSecureToken generates a cryptographically secure random token
func generateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// CreateShareHandler handles POST /api/share
func CreateShareHandler(store *ShareStore, baseURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req ShareRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate required fields
		if req.EncryptedPassword == "" || req.ServiceName == "" || req.Username == "" {
			http.Error(w, "Missing required fields", http.StatusBadRequest)
			return
		}

		// Set default expiration to 24 hours if not specified
		expirationHours := req.ExpirationHours
		if expirationHours <= 0 {
			expirationHours = 24
		}

		// Generate secure token (32 bytes = ~43 characters in base64)
		token, err := generateSecureToken(32)
		if err != nil {
			log.Printf("Error generating token: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Create share data
		now := time.Now()
		shareData := &ShareData{
			EncryptedPassword: req.EncryptedPassword,
			ServiceName:       req.ServiceName,
			Username:          req.Username,
			CreatedAt:         now,
			ExpiresAt:         now.Add(time.Duration(expirationHours) * time.Hour),
			Viewed:            false,
		}

		// Store the share
		store.Add(token, shareData)

		// Create response
		shareURL := fmt.Sprintf("%s/share/%s", baseURL, token)
		response := ShareResponse{
			Token:     token,
			ShareURL:  shareURL,
			ExpiresAt: shareData.ExpiresAt,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		
		log.Printf("Created share: token=%s, service=%s, expires=%s", 
			token[:10]+"...", req.ServiceName, shareData.ExpiresAt.Format(time.RFC3339))
	}
}

// GetShareHandler handles GET /api/share/:token
func GetShareHandler(store *ShareStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Extract token from path
		path := strings.TrimPrefix(r.URL.Path, "/api/share/")
		token := path

		if token == "" {
			http.Error(w, "Token required", http.StatusBadRequest)
			return
		}

		// Retrieve share
		shareData, exists := store.Get(token)
		if !exists {
			http.Error(w, "Share not found or expired", http.StatusNotFound)
			return
		}

		// Check if expired
		if time.Now().After(shareData.ExpiresAt) {
			store.Delete(token)
			http.Error(w, "Share has expired", http.StatusGone)
			return
		}

		// Check if already viewed (one-time use)
		if shareData.Viewed {
			response := ShareRetrieveResponse{
				EncryptedPassword: "",
				ServiceName:       shareData.ServiceName,
				Username:          shareData.Username,
				CreatedAt:         shareData.CreatedAt,
				ViewedAt:          shareData.ViewedAt,
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusGone)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error":   "This share has already been viewed",
				"details": response,
			})
			return
		}

		// Mark as viewed and delete (one-time use)
		store.MarkViewed(token)
		
		response := ShareRetrieveResponse{
			EncryptedPassword: shareData.EncryptedPassword,
			ServiceName:       shareData.ServiceName,
			Username:          shareData.Username,
			CreatedAt:         shareData.CreatedAt,
			ViewedAt:          shareData.ViewedAt,
		}

		// Delete immediately after viewing (one-time use)
		// We could also keep it for status checks but delete the password
		store.Delete(token)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		
		log.Printf("Share viewed and deleted: token=%s, service=%s", 
			token[:10]+"...", shareData.ServiceName)
	}
}

// DeleteShareHandler handles DELETE /api/share/:token
func DeleteShareHandler(store *ShareStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Extract token from path
		path := strings.TrimPrefix(r.URL.Path, "/api/share/")
		token := path

		if token == "" {
			http.Error(w, "Token required", http.StatusBadRequest)
			return
		}

		// Check if exists
		_, exists := store.Get(token)
		if !exists {
			http.Error(w, "Share not found", http.StatusNotFound)
			return
		}

		// Delete the share
		store.Delete(token)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Share deleted successfully",
		})
		
		log.Printf("Share manually deleted: token=%s", token[:10]+"...")
	}
}

// HealthHandler handles GET /api/health
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"time":   time.Now().Format(time.RFC3339),
	})
}
