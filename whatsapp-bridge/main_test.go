package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go.mau.fi/whatsmeow/types"
)

func TestNormalizePhone(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"Apenas digitos com DDD", "11999998888", "5511999998888"},
		{"Formatado com DDI", "+55 (21) 98888-7777", "5521988887777"},
		{"Apenas digitos com DDI", "5531977776666", "5531977776666"},
		{"Texto invalido", "abc", ""},
		{"Vazio", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizePhone(tt.input)
			if result != tt.expected {
				t.Errorf("normalizePhone(%q) = %q; quer %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestIsNewsletterJID(t *testing.T) {
	tests := []struct {
		name     string
		jid      types.JID
		expected bool
	}{
		{"Newsletter Server", types.JID{User: "123456", Server: "newsletter"}, true},
		{"User Server", types.JID{User: "5511999999999", Server: "s.whatsapp.net"}, false},
		{"Group Server", types.JID{User: "120363123456", Server: "g.us"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isNewsletterJID(tt.jid)
			if result != tt.expected {
				t.Errorf("isNewsletterJID(%v) = %v; quer %v", tt.jid, result, tt.expected)
			}
		})
	}
}

func TestExtensionForMime(t *testing.T) {
	tests := []struct {
		name     string
		mime     string
		expected string
	}{
		{"JPEG", "image/jpeg", ".jpg"},
		{"PNG", "image/png", ".png"},
		{"PDF", "application/pdf", ".pdf"},
		{"Ogg Audio", "audio/ogg", ".ogg"},
		{"WebP", "image/webp", ".webp"},
		{"Desconhecido", "application/octet-stream", ".bin"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extensionForMime(tt.mime)
			if result != tt.expected {
				t.Errorf("extensionForMime(%q) = %q; quer %q", tt.mime, result, tt.expected)
			}
		})
	}
}

func TestParseJID(t *testing.T) {
	tests := []struct {
		name         string
		input        string
		expectedErr  bool
		expectedUser string
	}{
		{"Apenas numero", "11999998888", false, "5511999998888"},
		{"Numero com DDI", "5521988887777", false, "5521988887777"},
		{"JID Completo", "5511999998888@s.whatsapp.net", false, "5511999998888"},
		{"Vazio", "", true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, err := parseJID(tt.input)
			if (err != nil) != tt.expectedErr {
				t.Errorf("parseJID(%q) retornou erro = %v; quer erro = %v", tt.input, err, tt.expectedErr)
			}
			if err == nil && res.User != tt.expectedUser {
				t.Errorf("parseJID(%q) usuario = %q; quer %q", tt.input, res.User, tt.expectedUser)
			}
		})
	}
}

func TestCallStatusAndEndRoutesUseCallIDFromPath(t *testing.T) {
	now := time.Now().Add(-2 * time.Minute)
	a := &app{
		calls: map[string]*call{
			"call-123": {
				ID:        "call-123",
				ChannelID: "channel-1",
				ToJID:     "5511999998888@s.whatsapp.net",
				State:     "ringing",
				Direction: "outgoing",
				StartTime: &now,
			},
		},
		sseConns: map[string][]chan callEvent{},
	}

	statusReq := httptest.NewRequest(http.MethodGet, "/calls/channel-1/call-123/status", nil)
	statusRes := httptest.NewRecorder()
	a.handleCalls(statusRes, statusReq)
	if statusRes.Code != http.StatusOK {
		t.Fatalf("status route code = %d; quer %d", statusRes.Code, http.StatusOK)
	}

	var status call
	if err := json.NewDecoder(statusRes.Body).Decode(&status); err != nil {
		t.Fatalf("decode status response: %v", err)
	}
	if status.ID != "call-123" {
		t.Fatalf("status ID = %q; quer call-123", status.ID)
	}

	endReq := httptest.NewRequest(http.MethodPost, "/calls/channel-1/call-123/end", nil)
	endRes := httptest.NewRecorder()
	a.handleCalls(endRes, endReq)
	if endRes.Code != http.StatusOK {
		t.Fatalf("end route code = %d; quer %d", endRes.Code, http.StatusOK)
	}
	if a.calls["call-123"].State != "ended" {
		t.Fatalf("call state = %q; quer ended", a.calls["call-123"].State)
	}
}
