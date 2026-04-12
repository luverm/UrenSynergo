import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

function Avatar({ url, name, size = 28 }) {
  if (url) return <div style={{ width: size, height: size, borderRadius: 2, background: `url(${url}) center/cover`, flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 2, background: "rgba(255,107,53,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontSize: size * 0.4, color: "#FF6B35", flexShrink: 0 }}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export default function Chat() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  const [messages, setMessages] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(true);

  const myName = profile?.display_name || user.email?.split("@")[0] || "Anoniem";
  const myAvatar = profile?.avatar_url || "";

  // Fetch initial messages and profiles
  useEffect(() => {
    const load = async () => {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);

      setMessages(msgs || []);

      const userIds = new Set((msgs || []).map((m) => m.user_id));
      if (userIds.size > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, email")
          .in("id", [...userIds]);
        const map = {};
        (profs || []).forEach((p) => { map[p.id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime channel
  useEffect(() => {
    const channel = supabase.channel("global-chat", {
      config: { presence: { key: user.id } },
    });

    // Presence
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const users = Object.values(state).map((arr) => arr[0]);
      setOnlineUsers(users);
    });

    // New messages via broadcast (instant, no replication config needed)
    channel.on("broadcast", { event: "new_message" }, async ({ payload }) => {
      const msg = payload;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Fetch profile if unknown
      setProfiles((prev) => {
        if (prev[msg.user_id]) return prev;
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url, email")
          .eq("id", msg.user_id)
          .single()
          .then(({ data }) => {
            if (data) setProfiles((p) => ({ ...p, [data.id]: data }));
          });
        return prev;
      });
    });

    // Typing broadcast
    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.user_id === user.id) return;
      setTypingUsers((prev) => ({ ...prev, [payload.user_id]: { name: payload.display_name, ts: Date.now() } }));
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: user.id,
          display_name: myName,
          avatar_url: myAvatar,
        });
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, myName, myAvatar]);

  // Clear stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next = {};
        for (const [uid, data] of Object.entries(prev)) {
          if (now - data.ts < 3000) next[uid] = data;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user.id, display_name: myName },
    });
  }, [user.id, myName]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    const { data, error } = await supabase
      .from("chat_messages")
      .insert([{ user_id: user.id, content }])
      .select()
      .single();

    if (data) {
      // Add to own messages immediately
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
      // Broadcast to other clients
      channelRef.current?.send({
        type: "broadcast",
        event: "new_message",
        payload: data,
      });
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const typingNames = Object.values(typingUsers).map((t) => t.name);

  // Group consecutive messages from same user
  const shouldShowHeader = (msg, idx) => {
    if (idx === 0) return true;
    const prev = messages[idx - 1];
    if (prev.user_id !== msg.user_id) return true;
    const gap = new Date(msg.created_at) - new Date(prev.created_at);
    return gap > 5 * 60 * 1000; // 5 min gap
  };

  return (
    <div style={{ height: "100vh", background: "#0E0E10", fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@200;300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        textarea:focus { border-color: rgba(255,107,53,0.5) !important; outline: none; }
      `}</style>

      {/* Top bar */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/")} style={{
            padding: "6px 14px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent", color: "#6E6E72", fontSize: 11, fontWeight: 500,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: 1, textTransform: "uppercase",
          }}>
            ← Terug
          </button>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 400,  }}>
            Chat
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#6E6E72" }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 99, background: "#FF6B35", marginRight: 6, verticalAlign: "middle" }} />
          {onlineUsers.length} online
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Online users sidebar */}
        <div style={{ width: 200, borderRight: "1px solid rgba(255,255,255,0.04)", padding: "16px 0", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: "0 16px", fontSize: 10, fontWeight: 500, color: "#6E6E72", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Online</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {onlineUsers.map((u) => (
              <div key={u.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px" }}>
                <div style={{ position: "relative" }}>
                  <Avatar url={u.avatar_url} name={u.display_name} size={24} />
                  <div style={{ position: "absolute", bottom: -1, right: -1, width: 7, height: 7, borderRadius: 99, background: "#FF6B35", border: "2px solid #0E0E10" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 400, color: "#F5F3EE", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.display_name}
                  {u.user_id === user.id && <span style={{ color: "#6E6E72", marginLeft: 4 }}>(jij)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {loading && (
              <div style={{ textAlign: "center", padding: 40, color: "#6E6E72", fontSize: 13 }}>Laden...</div>
            )}
            {!loading && messages.length === 0 && (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>💬</div>
                <div style={{ fontSize: 14, color: "#6E6E72" }}>Nog geen berichten</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", marginTop: 4 }}>Stuur het eerste bericht!</div>
              </div>
            )}
            {messages.map((msg, idx) => {
              const isMe = msg.user_id === user.id;
              const p = profiles[msg.user_id];
              const showHead = shouldShowHeader(msg, idx);
              return (
                <div key={msg.id} style={{ marginTop: showHead ? 16 : 2, animation: idx >= messages.length - 3 ? "fadeUp 0.3s cubic-bezier(.22,1,.36,1) both" : "none" }}>
                  {showHead && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Avatar url={p?.avatar_url} name={p?.display_name || p?.email} size={22} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: isMe ? "#FF6B35" : "#F5F3EE" }}>
                        {isMe ? "Jij" : (p?.display_name || p?.email?.split("@")[0])}
                      </span>
                      <span style={{ fontSize: 10, color: "#6E6E72" }}>{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  <div style={{ paddingLeft: 30, fontSize: 14, fontWeight: 300, lineHeight: 1.6, color: "#F5F3EE", whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator */}
          <div style={{ padding: "0 24px", height: 20, flexShrink: 0 }}>
            {typingNames.length > 0 && (
              <div style={{ fontSize: 12, color: "#6E6E72", fontWeight: 300, animation: "pulse 1.5s infinite" }}>
                {typingNames.length === 1
                  ? `${typingNames[0]} is aan het typen...`
                  : `${typingNames.slice(0, -1).join(", ")} en ${typingNames[typingNames.length - 1]} zijn aan het typen...`
                }
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 8, flexShrink: 0 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); sendTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder="Schrijf een bericht..."
              rows={1}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 2, resize: "none",
                border: "1px solid rgba(255,107,53,0.15)", background: "rgba(255,255,255,0.03)",
                color: "#F5F3EE", fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
                outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
                maxHeight: 120, overflow: "auto",
              }}
            />
            <button onClick={handleSend} disabled={!input.trim() || sending} style={{
              padding: "12px 20px", borderRadius: 2, border: "none",
              background: input.trim() && !sending ? "#FF6B35" : "rgba(255,255,255,0.04)",
              color: input.trim() && !sending ? "#0E0E10" : "rgba(255,255,255,0.15)",
              fontSize: 13, fontWeight: 600, cursor: input.trim() && !sending ? "pointer" : "default",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.25s", flexShrink: 0,
            }}>
              Verstuur
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
