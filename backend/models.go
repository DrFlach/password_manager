package main

import (
	"sync"
	"time"
)

// ShareData represents a password share with expiration and view tracking
type ShareData struct {
	EncryptedPassword string    `json:"encrypted_password"`
	ServiceName       string    `json:"service_name"`
	Username          string    `json:"username"`
	CreatedAt         time.Time `json:"created_at"`
	ExpiresAt         time.Time `json:"expires_at"`
	Viewed            bool      `json:"viewed"`
	ViewedAt          *time.Time `json:"viewed_at,omitempty"`
}

// ShareRequest represents the incoming request to create a share
type ShareRequest struct {
	EncryptedPassword string `json:"encrypted_password" binding:"required"`
	ServiceName       string `json:"service_name" binding:"required"`
	Username          string `json:"username" binding:"required"`
	ExpirationHours   int    `json:"expiration_hours"` // default 24 if not set
}

// ShareResponse represents the response when creating a share
type ShareResponse struct {
	Token     string    `json:"token"`
	ShareURL  string    `json:"share_url"`
	ExpiresAt time.Time `json:"expires_at"`
}

// ShareRetrieveResponse represents the response when retrieving a share
type ShareRetrieveResponse struct {
	EncryptedPassword string     `json:"encrypted_password"`
	ServiceName       string     `json:"service_name"`
	Username          string     `json:"username"`
	CreatedAt         time.Time  `json:"created_at"`
	ViewedAt          *time.Time `json:"viewed_at,omitempty"`
}

// ShareStore manages the in-memory storage of password shares
type ShareStore struct {
	shares map[string]*ShareData
	mu     sync.RWMutex
}

// NewShareStore creates a new share store
func NewShareStore() *ShareStore {
	return &ShareStore{
		shares: make(map[string]*ShareData),
	}
}

// Add stores a new share
func (s *ShareStore) Add(token string, data *ShareData) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.shares[token] = data
}

// Get retrieves a share by token
func (s *ShareStore) Get(token string) (*ShareData, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	data, exists := s.shares[token]
	return data, exists
}

// MarkViewed marks a share as viewed
func (s *ShareStore) MarkViewed(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if data, exists := s.shares[token]; exists {
		now := time.Now()
		data.Viewed = true
		data.ViewedAt = &now
	}
}

// Delete removes a share
func (s *ShareStore) Delete(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.shares, token)
}

// CleanupExpired removes expired shares
func (s *ShareStore) CleanupExpired() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	count := 0
	now := time.Now()
	
	for token, data := range s.shares {
		if now.After(data.ExpiresAt) {
			delete(s.shares, token)
			count++
		}
	}
	
	return count
}

// GetAll returns all shares (for debugging/admin purposes)
func (s *ShareStore) GetAll() map[string]*ShareData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	// Return a copy to prevent external modifications
	copy := make(map[string]*ShareData)
	for k, v := range s.shares {
		copy[k] = v
	}
	return copy
}
