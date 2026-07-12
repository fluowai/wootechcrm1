package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	_ "github.com/lib/pq"
	"github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	_ "modernc.org/sqlite"
)

type session struct {
	OrganizationID string
	ChannelID      string
	Phone          string
	Client         *whatsmeow.Client
	QRCode         string
	Status         string
	mu             sync.Mutex
}

type call struct {
	ID        string     `json:"id"`
	ChannelID string     `json:"channelId"`
	ToJID     string     `json:"toJid"`
	State     string     `json:"state"`
	Direction string     `json:"direction"`
	Duration  int        `json:"duration,omitempty"`
	StartTime *time.Time `json:"startTime,omitempty"`
	EndTime   *time.Time `json:"endTime,omitempty"`
	Error     string     `json:"error,omitempty"`
	FromJID   string     `json:"fromJid,omitempty"`
	mu        sync.Mutex
}

type callEvent struct {
	Type   string         `json:"type"`
	CallID string         `json:"callId"`
	Data   map[string]any `json:"data,omitempty"`
}

type app struct {
	sessions map[string]*session
	calls    map[string]*call
	mu       sync.Mutex
	callMu   sync.Mutex
	callNext int
	sseConns map[string][]chan callEvent
	sseMu    sync.Mutex
	dataDir  string
	mediaDir string
}

type connectRequest struct {
	OrganizationID string `json:"organizationId"`
	ChannelID      string `json:"channelId"`
	Phone          string `json:"phone"`
	ConnectedJID   string `json:"connectedJid"`
}

type sendRequest struct {
	ChannelID string `json:"channelId"`
	To        string `json:"to"`
	Message   string `json:"message"`
}

type participantIdentity struct {
	JID          types.JID
	PhoneNumber  types.JID
	LID          types.JID
	Name         string
	PictureURL   string
	IsAdmin      bool
	IsSuperAdmin bool
}

func env(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func main() {
	dataDir := env("WHATSAPP_BRIDGE_DATA_DIR", "./data")
	mediaDir := filepath.Join(dataDir, "media")
	_ = os.MkdirAll(mediaDir, 0o755)

	a := &app{
		sessions: map[string]*session{},
		calls:    map[string]*call{},
		sseConns: map[string][]chan callEvent{},
		dataDir:  dataDir,
		mediaDir: mediaDir,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "service": "whatsmeow-bridge"})
	})
	mux.HandleFunc("/media/", a.handleMedia)
	mux.HandleFunc("/sessions/", a.handleSessions)
	mux.HandleFunc("/calls/", a.handleCalls)

	addr := env("WHATSAPP_BRIDGE_ADDR", ":8091")
	log.Printf("Nexus360 Whatsmeow bridge listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, withSecret(mux)))
}

func withSecret(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/media/") || r.URL.Path == "/health" {
			next.ServeHTTP(w, r)
			return
		}
		expected := env("WHATSAPP_BRIDGE_SECRET", "dev-whatsapp-bridge-secret")
		if r.Header.Get("x-whatsapp-bridge-secret") != expected {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "INVALID_BRIDGE_SECRET"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *app) handleSessions(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/sessions/"), "/")
	if len(parts) < 2 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
		return
	}

	channelID, action := parts[0], parts[1]
	switch action {
	case "connect":
		a.handleConnect(w, r, channelID)
	case "disconnect":
		a.handleDisconnect(w, r, channelID)
	case "send":
		a.handleSend(w, r, channelID)
	case "status":
		a.handleStatus(w, r, channelID)
	case "delete":
		a.handleDelete(w, r, channelID)
	default:
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
	}
}

func (a *app) handleConnect(w http.ResponseWriter, r *http.Request, channelID string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}

	var req connectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	if req.ChannelID == "" {
		req.ChannelID = channelID
	}

	s, err := a.getOrCreateSession(req)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}

	go s.connect(a)
	s.mu.Lock()
	status := s.Status
	qrCode := s.QRCode
	s.mu.Unlock()
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "status": status, "qrCode": qrCode})
}

func (a *app) handleDisconnect(w http.ResponseWriter, r *http.Request, channelID string) {
	s := a.getSession(channelID)
	if s == nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "status": "disconnected"})
		return
	}
	s.mu.Lock()
	if s.Client != nil {
		s.Client.Disconnect()
	}
	s.Status = "disconnected"
	s.QRCode = ""
	s.mu.Unlock()
	a.postStatus(s, "disconnected", nil)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "status": "disconnected"})
}

func (a *app) handleStatus(w http.ResponseWriter, r *http.Request, channelID string) {
	s := a.getSession(channelID)
	if s == nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "status": "not_found"})
		return
	}

	s.mu.Lock()
	status := s.Status
	qrCode := s.QRCode
	client := s.Client
	s.mu.Unlock()

	connected := client != nil && client.IsLoggedIn()
	if connected {
		status = "connected"
	}
	profile := a.selfProfile(s)

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":        true,
		"status":    status,
		"connected": connected,
		"qrCode":    qrCode,
		"profile":   profile,
	})
}

func (a *app) handleDelete(w http.ResponseWriter, r *http.Request, channelID string) {
	s := a.getSession(channelID)
	if s != nil {
		s.mu.Lock()
		if s.Client != nil {
			s.Client.Disconnect()
		}
		s.Status = "deleted"
		s.QRCode = ""
		s.mu.Unlock()
		a.postStatus(s, "deleted", nil)
	}

	a.mu.Lock()
	delete(a.sessions, channelID)
	a.mu.Unlock()

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "status": "deleted"})
}

func (a *app) handleCalls(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/calls/"), "/")
	if len(parts) < 2 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
		return
	}
	channelID, action := parts[0], parts[1]
	switch {
	case action == "active" && len(parts) == 2:
		a.handleActiveCalls(w, r, channelID)
	case action == "events" && len(parts) == 2:
		a.handleCallEventsSSE(w, r, channelID)
	case action == "initiate" && len(parts) == 2:
		a.handleInitiateCall(w, r, channelID)
	case len(parts) == 3 && parts[2] == "end":
		a.handleEndCall(w, r, channelID, parts[1])
	case len(parts) == 3 && parts[2] == "status":
		a.handleCallStatus(w, r, channelID, parts[1])
	default:
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
	}
}

func (a *app) newCallID() string {
	a.callMu.Lock()
	defer a.callMu.Unlock()
	a.callNext++
	data := make([]byte, 4)
	rand.Read(data)
	return fmt.Sprintf("call_%x_%d", data, a.callNext)
}

func (a *app) addSSEConn(channelID string, ch chan callEvent) {
	a.sseMu.Lock()
	defer a.sseMu.Unlock()
	a.sseConns[channelID] = append(a.sseConns[channelID], ch)
}

func (a *app) removeSSEConn(channelID string, ch chan callEvent) {
	a.sseMu.Lock()
	defer a.sseMu.Unlock()
	conns := a.sseConns[channelID]
	for i, c := range conns {
		if c == ch {
			a.sseConns[channelID] = append(conns[:i], conns[i+1:]...)
			break
		}
	}
}

func (a *app) broadcastCallEvent(channelID string, evt callEvent) {
	a.sseMu.Lock()
	conns := append([]chan callEvent{}, a.sseConns[channelID]...)
	a.sseMu.Unlock()
	for _, ch := range conns {
		select {
		case ch <- evt:
		default:
		}
	}
}

func (a *app) handleInitiateCall(w http.ResponseWriter, r *http.Request, channelID string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}
	var req struct {
		OrganizationID string `json:"organizationId"`
		ChannelID      string `json:"channelId"`
		ToJID          string `json:"toJid"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	if req.ChannelID == "" {
		req.ChannelID = channelID
	}

	s := a.getSession(req.ChannelID)
	if s == nil || s.Client == nil || !s.Client.IsConnected() {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "sessao WhatsApp desconectada"})
		return
	}

	to, err := parseJID(req.ToJID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	callID := a.newCallID()
	now := time.Now()
	c := &call{
		ID:        callID,
		ChannelID: req.ChannelID,
		ToJID:     to.String(),
		State:     "ringing",
		Direction: "outgoing",
		StartTime: &now,
	}
	a.callMu.Lock()
	a.calls[callID] = c
	a.callMu.Unlock()

	// Send a call notification message via whatsmeow
	_, err = s.Client.SendMessage(context.Background(), to, &waProto.Message{
		Call: &waProto.Call{
			CallKey: []byte(callID),
		},
	})
	if err != nil {
		c.mu.Lock()
		c.State = "failed"
		c.Error = err.Error()
		c.mu.Unlock()
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}

	// Also send a text notification
	_, _ = s.Client.SendMessage(context.Background(), to, &waProto.Message{
		Conversation: proto.String("🔔 Chamada de voz iniciada pelo CRM..."),
	})

	a.broadcastCallEvent(req.ChannelID, callEvent{
		Type:   "call_initiated",
		CallID: callID,
		Data:   map[string]any{"toJid": to.String(), "state": "ringing"},
	})

	writeJSON(w, http.StatusOK, c)
}

func (a *app) handleEndCall(w http.ResponseWriter, r *http.Request, channelID, callID string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}
	a.callMu.Lock()
	c, ok := a.calls[callID]
	if !ok || c.ChannelID != channelID {
		a.callMu.Unlock()
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "call not found"})
		return
	}
	c.mu.Lock()
	c.State = "ended"
	now := time.Now()
	c.EndTime = &now
	if c.StartTime != nil {
		c.Duration = int(now.Sub(*c.StartTime).Seconds())
	}
	c.mu.Unlock()
	a.callMu.Unlock()

	a.broadcastCallEvent(channelID, callEvent{
		Type:   "call_ended",
		CallID: callID,
		Data:   map[string]any{"duration": c.Duration},
	})

	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (a *app) handleCallStatus(w http.ResponseWriter, r *http.Request, channelID, callID string) {
	a.callMu.Lock()
	c, ok := a.calls[callID]
	a.callMu.Unlock()
	if !ok || c.ChannelID != channelID {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "call not found"})
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (a *app) handleActiveCalls(w http.ResponseWriter, r *http.Request, channelID string) {
	a.callMu.Lock()
	active := []*call{}
	for _, c := range a.calls {
		if c.ChannelID == channelID && (c.State == "ringing" || c.State == "connected") {
			active = append(active, c)
		}
	}
	a.callMu.Unlock()
	sort.Slice(active, func(i, j int) bool {
		if active[i].StartTime == nil || active[j].StartTime == nil {
			return false
		}
		return active[i].StartTime.After(*active[j].StartTime)
	})
	writeJSON(w, http.StatusOK, active)
}

func (a *app) handleCallEventsSSE(w http.ResponseWriter, r *http.Request, channelID string) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	ch := make(chan callEvent, 64)
	a.addSSEConn(channelID, ch)

	notify := r.Context().Done()
	go func() {
		<-notify
		a.removeSSEConn(channelID, ch)
	}()

	for {
		select {
		case <-notify:
			return
		case evt, ok := <-ch:
			if !ok {
				return
			}
			data, _ := json.Marshal(evt)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", evt.Type, data)
			flusher.Flush()
		}
	}
}

func (a *app) handleSend(w http.ResponseWriter, r *http.Request, channelID string) {
	var req sendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	if req.ChannelID == "" {
		req.ChannelID = channelID
	}

	s := a.getSession(req.ChannelID)
	if s == nil || s.Client == nil || !s.Client.IsConnected() {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "sessao WhatsApp desconectada"})
		return
	}

	to, err := parseJID(req.To)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	resp, err := s.Client.SendMessage(context.Background(), to, &waProto.Message{Conversation: proto.String(req.Message)})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "messageId": resp.ID})
}

func (a *app) getSession(channelID string) *session {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.sessions[channelID]
}

func (a *app) getOrCreateSession(req connectRequest) (*session, error) {
	a.mu.Lock()
	if existing := a.sessions[req.ChannelID]; existing != nil {
		a.mu.Unlock()
		return existing, nil
	}
	a.mu.Unlock()

	dbLog := waLog.Stdout("Database", "WARN", true)
	ctx := context.Background()
	var container *sqlstore.Container
	var err error

	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl != "" {
		container, err = sqlstore.New(ctx, "postgres", dbUrl, dbLog)
	} else {
		dbPath := filepath.Join(a.dataDir, "sessions.db")
		container, err = sqlstore.New(ctx, "sqlite", "file:"+dbPath+"?_pragma=foreign_keys(1)", dbLog)
	}

	if err != nil {
		return nil, err
	}
	deviceStore := container.NewDevice()
	if req.ConnectedJID != "" {
		jid, parseErr := types.ParseJID(strings.TrimSpace(req.ConnectedJID))
		if parseErr != nil {
			return nil, fmt.Errorf("connectedJid invalido: %w", parseErr)
		}
		storedDevice, getErr := container.GetDevice(ctx, jid)
		if getErr != nil {
			return nil, getErr
		}
		if storedDevice != nil {
			deviceStore = storedDevice
		}
	}

	clientLog := waLog.Stdout("Client", "INFO", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	s := &session{
		OrganizationID: req.OrganizationID,
		ChannelID:      req.ChannelID,
		Phone:          normalizePhone(req.Phone),
		Client:         client,
		Status:         "created",
	}
	client.AddEventHandler(func(evt any) {
		a.handleWhatsmeowEvent(s, evt)
	})

	a.mu.Lock()
	a.sessions[req.ChannelID] = s
	a.mu.Unlock()
	return s, nil
}

func (s *session) connect(a *app) {
	s.mu.Lock()
	if s.Client == nil {
		s.mu.Unlock()
		return
	}
	if s.Status == "connecting" || s.Status == "qr" {
		s.mu.Unlock()
		return
	}
	if s.Client.IsLoggedIn() {
		s.Status = "connected"
		s.mu.Unlock()
		a.postStatus(s, "connected", nil)
		return
	}
	isNewLogin := s.Client.Store.ID == nil
	s.Status = "connecting"
	s.mu.Unlock()
	a.postStatus(s, "connecting", nil)

	if isNewLogin {
		qrChan, err := s.Client.GetQRChannel(context.Background())
		if err != nil {
			a.postStatus(s, "error", map[string]any{"error": err.Error()})
			return
		}
		connectCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		if err := s.Client.ConnectContext(connectCtx); err != nil {
			cancel()
			a.postStatus(s, "error", map[string]any{"error": err.Error()})
			return
		}
		cancel()

		qrTimeout := time.NewTimer(45 * time.Second)
		defer qrTimeout.Stop()
		for {
			select {
			case evt, ok := <-qrChan:
				if !ok {
					if !s.Client.IsLoggedIn() {
						a.postStatus(s, "error", map[string]any{"error": "Canal de QR encerrado antes de gerar o codigo"})
					}
					return
				}
				if evt.Event == "code" {
					if !qrTimeout.Stop() {
						select {
						case <-qrTimeout.C:
						default:
						}
					}
					qrTimeout.Reset(45 * time.Second)
					s.mu.Lock()
					s.QRCode = evt.Code
					s.Status = "qr"
					s.mu.Unlock()
					a.postStatus(s, "qr", map[string]any{"qrCode": evt.Code, "qrPng": qrDataURL(evt.Code)})
				} else if evt.Event == "success" {
					a.postStatus(s, "connected", a.selfProfile(s))
					return
				} else if evt.Event == "timeout" {
					a.postStatus(s, "error", map[string]any{"error": "QR Code expirou antes de ser escaneado"})
					s.Client.Disconnect()
					return
				} else {
					a.postStatus(s, evt.Event, nil)
				}
			case <-qrTimeout.C:
				a.postStatus(s, "error", map[string]any{"error": "Tempo esgotado aguardando QR Code do WhatsApp"})
				s.Client.Disconnect()
				return
			}
		}
	} else {
		connectCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		err := s.Client.ConnectContext(connectCtx)
		cancel()
		if err != nil {
			a.postStatus(s, "error", map[string]any{"error": err.Error()})
			return
		}
	}

	if s.Client.IsLoggedIn() {
		a.postStatus(s, "connected", a.selfProfile(s))
	}
}

func (a *app) handleWhatsmeowEvent(s *session, evt any) {
	switch v := evt.(type) {
	case *events.Connected:
		a.postStatus(s, "connected", a.selfProfile(s))
	case *events.Disconnected:
		a.postStatus(s, "disconnected", nil)
	case *events.LoggedOut:
		a.postStatus(s, "logged_out", nil)
	case *events.Message:
		a.handleMessage(s, v)
	case *events.CallOffer:
		callID := a.newCallID()
		now := time.Now()
		c := &call{
			ID:        callID,
			ChannelID: s.ChannelID,
			ToJID:     v.CallCreator.String(),
			FromJID:   v.CallCreator.String(),
			State:     "ringing",
			Direction: "incoming",
			StartTime: &now,
		}
		a.callMu.Lock()
		a.calls[callID] = c
		a.callMu.Unlock()
		a.broadcastCallEvent(s.ChannelID, callEvent{
			Type:   "call_offer",
			CallID: callID,
			Data: map[string]any{
				"callCreator": v.CallCreator.String(),
				"callID":      v.CallID,
			},
		})
		a.postInternal(map[string]any{
			"type":        "call_offer",
			"channelId":   s.ChannelID,
			"callId":      callID,
			"callCreator": v.CallCreator.String(),
			"timestamp":   time.Now().Format(time.RFC3339),
		})
	case *events.CallTerminate:
		a.callMu.Lock()
		for _, c := range a.calls {
			if c.ChannelID == s.ChannelID && (c.State == "ringing" || c.State == "connected") {
				c.mu.Lock()
				c.State = "ended"
				now := time.Now()
				c.EndTime = &now
				if c.StartTime != nil {
					c.Duration = int(now.Sub(*c.StartTime).Seconds())
				}
				c.mu.Unlock()
				a.broadcastCallEvent(s.ChannelID, callEvent{
					Type:   "call_terminated",
					CallID: c.ID,
					Data:   map[string]any{"reason": v.Reason},
				})
				break
			}
		}
		a.callMu.Unlock()
	}
}

func (a *app) selfProfile(s *session) map[string]any {
	out := map[string]any{}
	if s.Client == nil || s.Client.Store == nil || s.Client.Store.ID == nil {
		return out
	}
	out["connectedJid"] = s.Client.Store.ID.String()
	out["pushName"] = s.Client.Store.PushName
	if pic := a.profilePictureURL(s.Client, *s.Client.Store.ID, false); pic != "" {
		out["profilePictureUrl"] = pic
	}
	return out
}

func (a *app) handleMessage(s *session, evt *events.Message) {
	msg := evt.Message
	if msg == nil {
		return
	}

	chatJID := evt.Info.Chat
	if isNewsletterJID(chatJID) {
		return
	}

	senderJID := evt.Info.Sender
	if senderJID.IsEmpty() {
		senderJID = chatJID
	}
	rawSenderJID := senderJID

	messageType, content, caption, fileName, mimeType, mediaPath, fileSize := a.extractMessage(s.Client, evt.Info.ID, msg)
	displayName := evt.Info.PushName
	group := map[string]any(nil)
	var participants []map[string]any
	participantMap := map[string]participantIdentity{}

	if chatJID.Server == types.GroupServer {
		info, err := s.Client.GetGroupInfo(context.Background(), chatJID)
		if err == nil && info != nil {
			displayName = info.Name
			group = map[string]any{
				"jid":        chatJID.String(),
				"name":       info.Name,
				"pictureUrl": a.profilePictureURL(s.Client, chatJID, false),
			}
			for _, participant := range info.Participants {
				identity := participantIdentity{
					JID:          participant.JID,
					PhoneNumber:  participant.PhoneNumber,
					LID:          participant.LID,
					Name:         participant.DisplayName,
					PictureURL:   a.profilePictureURL(s.Client, participant.JID, false),
					IsAdmin:      participant.IsAdmin,
					IsSuperAdmin: participant.IsSuperAdmin,
				}
				a.indexParticipant(participantMap, identity)
				item := map[string]any{
					"jid":          a.resolvePhoneJID(s.Client, participant.JID, participantMap).String(),
					"rawJid":       participant.JID.String(),
					"phoneNumber":  a.resolvePhoneJID(s.Client, participant.PhoneNumber, participantMap).String(),
					"lid":          participant.LID.String(),
					"name":         participant.DisplayName,
					"pushName":     participant.DisplayName,
					"isAdmin":      participant.IsAdmin,
					"isSuperAdmin": participant.IsSuperAdmin,
					"pictureUrl":   identity.PictureURL,
				}
				participants = append(participants, item)
			}
			group["participants"] = participants
		}
	}

	resolvedSenderJID := a.resolvePhoneJID(s.Client, senderJID, participantMap)
	if !resolvedSenderJID.IsEmpty() {
		senderJID = resolvedSenderJID
	}
	mentionedJIDs := a.resolveMentionedJIDs(s.Client, msg, participantMap)

	payload := map[string]any{
		"type":              "message",
		"organizationId":    s.OrganizationID,
		"channelId":         s.ChannelID,
		"chatJid":           chatJID.String(),
		"senderJid":         senderJID.String(),
		"rawSenderJid":      rawSenderJID.String(),
		"fromMe":            evt.Info.IsFromMe,
		"isGroup":           chatJID.Server == types.GroupServer,
		"pushName":          evt.Info.PushName,
		"senderPushName":    evt.Info.PushName,
		"displayName":       displayName,
		"profilePictureUrl": a.profilePictureURL(s.Client, senderJID, false),
		"group":             group,
		"participants":      participants,
		"mentionedJids":     mentionedJIDs,
		"message": map[string]any{
			"id":        evt.Info.ID,
			"timestamp": evt.Info.Timestamp.Format(time.RFC3339),
			"type":      messageType,
			"content":   content,
			"caption":   caption,
			"fileName":  fileName,
			"mimeType":  mimeType,
			"fileUrl":   mediaPath,
			"fileSize":  fileSize,
		},
	}
	a.postInternal(payload)
}

func (a *app) extractMessage(client *whatsmeow.Client, messageID string, msg *waProto.Message) (kind, content, caption, fileName, mimeType, mediaURL string, fileSize int) {
	if text := msg.GetConversation(); text != "" {
		return "text", text, "", "", "", "", 0
	}
	if ext := msg.GetExtendedTextMessage(); ext != nil {
		return "text", ext.GetText(), "", "", "", "", 0
	}
	if reaction := msg.GetReactionMessage(); reaction != nil {
		payload, _ := json.Marshal(map[string]any{
			"text":      reaction.GetText(),
			"targetId":  reaction.GetKey().GetID(),
			"timestamp": reaction.GetSenderTimestampMS(),
		})
		return "reaction", string(payload), "", "", "application/json", "", 0
	}
	if protocol := msg.GetProtocolMessage(); protocol != nil {
		payload, _ := json.Marshal(map[string]any{
			"type":      protocol.GetType().String(),
			"targetId":  protocol.GetKey().GetID(),
			"timestamp": protocol.GetTimestampMS(),
		})
		switch protocol.GetType().String() {
		case "REVOKE":
			return "deleted", string(payload), "", "", "application/json", "", 0
		case "MESSAGE_EDIT":
			return "edited", string(payload), "", "", "application/json", "", 0
		default:
			return "system", string(payload), "", "", "application/json", "", 0
		}
	}
	if contact := msg.GetContactMessage(); contact != nil {
		payload, _ := json.Marshal(map[string]any{
			"displayName": contact.GetDisplayName(),
			"vcard":       contact.GetVcard(),
			"isSelf":      contact.GetIsSelfContact(),
		})
		return "contact", string(payload), "", contact.GetDisplayName(), "application/json", "", 0
	}
	if contacts := msg.GetContactsArrayMessage(); contacts != nil {
		items := []map[string]any{}
		for _, contact := range contacts.GetContacts() {
			items = append(items, map[string]any{
				"displayName": contact.GetDisplayName(),
				"vcard":       contact.GetVcard(),
				"isSelf":      contact.GetIsSelfContact(),
			})
		}
		payload, _ := json.Marshal(map[string]any{
			"displayName": contacts.GetDisplayName(),
			"contacts":    items,
		})
		return "contact", string(payload), "", contacts.GetDisplayName(), "application/json", "", 0
	}
	if location := msg.GetLocationMessage(); location != nil {
		payload, _ := json.Marshal(map[string]any{
			"latitude":  location.GetDegreesLatitude(),
			"longitude": location.GetDegreesLongitude(),
			"name":      location.GetName(),
			"address":   location.GetAddress(),
			"url":       location.GetURL(),
			"isLive":    location.GetIsLive(),
			"comment":   location.GetComment(),
		})
		return "location", string(payload), "", location.GetName(), "application/json", "", 0
	}
	if liveLocation := msg.GetLiveLocationMessage(); liveLocation != nil {
		return "live_location", protoPayload(liveLocation), "", liveLocation.GetCaption(), "application/json", "", 0
	}
	if poll := firstMessagePart(
		msg.GetPollCreationMessage(),
		msg.GetPollCreationMessageV2(),
		msg.GetPollCreationMessageV3(),
		msg.GetPollCreationMessageV5(),
		msg.GetPollCreationMessageV6(),
	); poll != nil {
		return "poll", protoPayload(poll), "", "", "application/json", "", 0
	}
	if msg.GetPollUpdateMessage() != nil {
		return "poll_update", protoPayload(msg.GetPollUpdateMessage()), "", "", "application/json", "", 0
	}
	if interactive := firstMessagePart(
		msg.GetButtonsMessage(),
		msg.GetButtonsResponseMessage(),
		msg.GetListMessage(),
		msg.GetListResponseMessage(),
		msg.GetTemplateMessage(),
		msg.GetTemplateButtonReplyMessage(),
		msg.GetInteractiveMessage(),
		msg.GetInteractiveResponseMessage(),
	); interactive != nil {
		return "interactive", protoPayload(interactive), "", "", "application/json", "", 0
	}
	if commerce := firstMessagePart(msg.GetProductMessage(), msg.GetOrderMessage()); commerce != nil {
		return "commerce", protoPayload(commerce), "", "", "application/json", "", 0
	}
	if call := firstMessagePart(msg.GetCall(), msg.GetCallLogMesssage()); call != nil {
		return "call", protoPayload(call), "", "", "application/json", "", 0
	}
	if event := msg.GetEventMessage(); event != nil {
		return "event", protoPayload(event), "", "", "application/json", "", 0
	}
	if image := msg.GetImageMessage(); image != nil {
		caption = image.GetCaption()
		mimeType = image.GetMimetype()
		mediaURL, fileSize = a.downloadMedia(client, messageID, image, mimeType)
		return "image", "", caption, "", mimeType, mediaURL, fileSize
	}
	if audio := msg.GetAudioMessage(); audio != nil {
		mimeType = audio.GetMimetype()
		mediaURL, fileSize = a.downloadMedia(client, messageID, audio, mimeType)
		return "audio", "", "", "", mimeType, mediaURL, fileSize
	}
	if video := msg.GetVideoMessage(); video != nil {
		caption = video.GetCaption()
		mimeType = video.GetMimetype()
		mediaURL, fileSize = a.downloadMedia(client, messageID, video, mimeType)
		return "video", "", caption, "", mimeType, mediaURL, fileSize
	}
	if doc := msg.GetDocumentMessage(); doc != nil {
		caption = doc.GetCaption()
		fileName = doc.GetFileName()
		mimeType = doc.GetMimetype()
		mediaURL, fileSize = a.downloadMedia(client, messageID, doc, mimeType)
		return "document", "", caption, fileName, mimeType, mediaURL, fileSize
	}
	if sticker := msg.GetStickerMessage(); sticker != nil {
		mimeType = sticker.GetMimetype()
		mediaURL, fileSize = a.downloadMedia(client, messageID, sticker, mimeType)
		return "image", "", "", "sticker.webp", mimeType, mediaURL, fileSize
	}
	return "text", "[mensagem nao suportada]", "", "", "", "", 0
}

func protoPayload(message proto.Message) string {
	data, err := protojson.MarshalOptions{EmitUnpopulated: false}.Marshal(message)
	if err != nil {
		return "{}"
	}
	return string(data)
}

func firstMessagePart(parts ...proto.Message) proto.Message {
	for _, part := range parts {
		if part != nil {
			return part
		}
	}
	return nil
}

func (a *app) indexParticipant(index map[string]participantIdentity, participant participantIdentity) {
	for _, jid := range []types.JID{participant.JID, participant.PhoneNumber, participant.LID} {
		if !jid.IsEmpty() {
			index[jid.String()] = participant
			if jid.User != "" {
				index[jid.User] = participant
			}
		}
	}
}

func (a *app) resolvePhoneJID(client *whatsmeow.Client, jid types.JID, participants map[string]participantIdentity) types.JID {
	if jid.IsEmpty() {
		return jid
	}
	if found, ok := participants[jid.String()]; ok {
		if !found.PhoneNumber.IsEmpty() && found.PhoneNumber.Server == types.DefaultUserServer {
			return found.PhoneNumber.ToNonAD()
		}
		if !found.JID.IsEmpty() && found.JID.Server == types.DefaultUserServer {
			return found.JID.ToNonAD()
		}
	}
	if jid.Server == types.DefaultUserServer {
		return jid.ToNonAD()
	}
	if (jid.Server == types.HiddenUserServer || jid.Server == types.HostedLIDServer) && client != nil && client.Store != nil && client.Store.LIDs != nil {
		if pn, err := client.Store.LIDs.GetPNForLID(context.Background(), jid.ToNonAD()); err == nil && !pn.IsEmpty() {
			return pn.ToNonAD()
		}
	}
	return jid.ToNonAD()
}

func (a *app) resolveMentionedJIDs(client *whatsmeow.Client, msg *waProto.Message, participants map[string]participantIdentity) []map[string]any {
	ctx := contextInfo(msg)
	if ctx == nil {
		return nil
	}
	var out []map[string]any
	seen := map[string]bool{}
	for _, raw := range ctx.GetMentionedJID() {
		jid, err := types.ParseJID(raw)
		if err != nil || jid.IsEmpty() {
			continue
		}
		resolved := a.resolvePhoneJID(client, jid, participants)
		key := resolved.String()
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, map[string]any{
			"jid":    key,
			"phone":  normalizePhone(resolved.User),
			"rawJid": raw,
		})
	}
	return out
}

func contextInfo(msg *waProto.Message) *waProto.ContextInfo {
	if msg == nil {
		return nil
	}
	if ext := msg.GetExtendedTextMessage(); ext != nil {
		return ext.GetContextInfo()
	}
	if image := msg.GetImageMessage(); image != nil {
		return image.GetContextInfo()
	}
	if audio := msg.GetAudioMessage(); audio != nil {
		return audio.GetContextInfo()
	}
	if video := msg.GetVideoMessage(); video != nil {
		return video.GetContextInfo()
	}
	if doc := msg.GetDocumentMessage(); doc != nil {
		return doc.GetContextInfo()
	}
	if sticker := msg.GetStickerMessage(); sticker != nil {
		return sticker.GetContextInfo()
	}
	return nil
}

func (a *app) downloadMedia(client *whatsmeow.Client, messageID string, media whatsmeow.DownloadableMessage, mimeType string) (string, int) {
	data, err := client.Download(context.Background(), media)
	if err != nil || len(data) == 0 {
		return "", 0
	}
	hash := sha1.Sum([]byte(messageID + time.Now().String()))
	ext := extensionForMime(mimeType)
	name := hex.EncodeToString(hash[:]) + ext
	path := filepath.Join(a.mediaDir, name)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return "", 0
	}
	baseURL := strings.TrimRight(env("WHATSAPP_BRIDGE_PUBLIC_URL", "http://localhost:8091"), "/")
	return baseURL + "/media/" + name, len(data)
}

func (a *app) profilePictureURL(client *whatsmeow.Client, jid types.JID, isCommunity bool) string {
	if client == nil || jid.IsEmpty() {
		return ""
	}
	info, err := client.GetProfilePictureInfo(context.Background(), jid, nil)
	if err != nil || info == nil {
		return ""
	}
	return info.URL
}

func (a *app) postStatus(s *session, status string, extra map[string]any) {
	s.mu.Lock()
	s.Status = status
	if qr, ok := extra["qrCode"].(string); ok {
		s.QRCode = qr
	} else if status != "qr" {
		s.QRCode = ""
	}
	qrCode := s.QRCode
	s.mu.Unlock()

	payload := map[string]any{
		"type":           "status",
		"organizationId": s.OrganizationID,
		"channelId":      s.ChannelID,
		"status":         status,
		"qrCode":         qrCode,
		"qrPng":          "",
	}
	for k, v := range extra {
		payload[k] = v
	}
	a.postInternal(payload)
}

func qrDataURL(code string) string {
	png, err := qrcode.Encode(code, qrcode.Medium, 320)
	if err != nil {
		return ""
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(png)
}

func (a *app) postInternal(payload map[string]any) {
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, strings.TrimRight(env("NEXUS_BACKEND_URL", "http://localhost:10000"), "/")+"/api/internal/whatsapp/events", bytes.NewReader(body))
	if err != nil {
		log.Printf("build internal request: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-whatsapp-bridge-secret", env("WHATSAPP_BRIDGE_SECRET", "dev-whatsapp-bridge-secret"))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("post internal event: %v", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		data, _ := io.ReadAll(resp.Body)
		log.Printf("internal event rejected: %s %s", resp.Status, string(data))
	}
}

func (a *app) handleMedia(w http.ResponseWriter, r *http.Request) {
	name := filepath.Base(strings.TrimPrefix(r.URL.Path, "/media/"))
	path := filepath.Join(a.mediaDir, name)
	if _, err := os.Stat(path); err != nil {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, path)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func parseJID(input string) (types.JID, error) {
	raw := strings.TrimSpace(input)
	if raw == "" {
		return types.EmptyJID, errors.New("destinatario vazio")
	}
	if strings.Contains(raw, "@") {
		return types.ParseJID(raw)
	}
	phone := normalizePhone(raw)
	if phone == "" {
		return types.EmptyJID, errors.New("telefone invalido")
	}
	return types.NewJID(phone, types.DefaultUserServer), nil
}

func normalizePhone(input string) string {
	digits := regexp.MustCompile(`\D+`).ReplaceAllString(input, "")
	if digits == "" {
		return ""
	}
	if len(digits) == 10 || len(digits) == 11 {
		digits = "55" + digits
	}
	return digits
}

func isNewsletterJID(jid types.JID) bool {
	server := strings.ToLower(jid.Server)
	raw := strings.ToLower(jid.String())
	return server == "newsletter" || strings.Contains(raw, "@newsletter")
}

func extensionForMime(mimeType string) string {
	switch {
	case strings.Contains(mimeType, "jpeg"):
		return ".jpg"
	case strings.Contains(mimeType, "png"):
		return ".png"
	case strings.Contains(mimeType, "ogg"):
		return ".ogg"
	case strings.Contains(mimeType, "webp"):
		return ".webp"
	case strings.Contains(mimeType, "pdf"):
		return ".pdf"
	}
	if ext, err := mime.ExtensionsByType(mimeType); err == nil && len(ext) > 0 {
		return ext[0]
	}
	return ".bin"
}

var _ = fmt.Sprintf
