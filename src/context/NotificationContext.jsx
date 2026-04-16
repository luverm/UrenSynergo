import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const TEAM_NAMES = ["Lucas", "Raymond", "Shihab"];

function detectTeamName(profile, user) {
  const sources = [
    profile?.display_name, user?.email,
    user?.user_metadata?.full_name, user?.user_metadata?.name,
  ].filter(Boolean).map((s) => s.toLowerCase());
  for (const name of TEAM_NAMES) {
    if (sources.some((s) => s.includes(name.toLowerCase()))) return name;
  }
  return "";
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NotificationProvider({ children }) {
  const { user, profile } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [briefing, setBriefing] = useState(null);
  const [permission, setPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "default");
  const toastIdRef = useRef(0);
  const myFirstName = detectTeamName(profile, user);
  const myId = user?.id;

  const push = useCallback((toast) => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { ...toast, id }]);
    // Auto-dismiss after 7s
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 7000);

    // Browser notification if granted and tab not visible
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
      try {
        const n = new Notification(toast.title, { body: toast.body, icon: "/elev8-favicon.png", tag: "synergo-" + id });
        n.onclick = () => { window.focus(); if (toast.onClick) toast.onClick(); };
      } catch (e) {}
    }
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
    } catch (e) {}
  }, []);

  // ═══ Live subscriptions ═══
  useEffect(() => {
    if (!myId) return;

    // 1. Listen to chat for @mentions
    const chatChannel = supabase.channel("global-chat")
      .on("broadcast", { event: "new_message" }, async ({ payload }) => {
        if (!payload || !payload.content) return;
        if (payload.user_id === myId) return; // Don't notify yourself
        // Detect @mentions
        const content = payload.content;
        const mentionRx = new RegExp(`@${myFirstName}\\b`, "i");
        if (myFirstName && mentionRx.test(content)) {
          // Fetch sender profile
          let senderName = "Iemand";
          const { data: sender } = await supabase.from("profiles").select("display_name, email").eq("id", payload.user_id).single();
          if (sender) senderName = sender.display_name || sender.email?.split("@")[0] || "Iemand";
          push({
            type: "mention",
            title: `💬 ${senderName} noemde je in chat`,
            body: content.length > 140 ? content.slice(0, 140) + "…" : content,
            color: "#FF6B35",
            onClick: () => { window.location.hash = ""; window.location.pathname = "/chat"; },
            link: "/chat",
          });
        }
      })
      .subscribe();

    // 2. Listen to requests table for new rows (postgres_changes)
    const reqChannel = supabase.channel("requests-insert-listener")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "requests" }, (payload) => {
        const r = payload.new;
        const name = r.from_name || (r.from_email ? r.from_email.split("@")[0] : "Onbekend");
        push({
          type: "request",
          title: `📬 Nieuwe aanvraag van ${name}`,
          body: r.subject || "(geen onderwerp)",
          color: "#E8B458",
          onClick: () => { window.location.href = `/sales?brand=${r.brand}&tab=aanvragen`; },
          link: `/sales?brand=${r.brand}&tab=aanvragen`,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(reqChannel);
    };
    // eslint-disable-next-line
  }, [myId, myFirstName]);

  // ═══ Daily briefing on first open of the day ═══
  useEffect(() => {
    if (!myId) return;
    const lastOpened = localStorage.getItem("synergo_last_opened");
    const today = todayISO();
    if (lastOpened === today) return; // Already briefed today

    (async () => {
      const since = lastOpened ? `${lastOpened}T23:59:59` : new Date(Date.now() - 7 * 86400000).toISOString();
      const [reqRes, chatRes] = await Promise.all([
        supabase.from("requests").select("id, subject, from_name, from_email, brand, received_at, status").gte("received_at", since).order("received_at", { ascending: false }),
        myFirstName
          ? supabase.from("chat_messages").select("id, content, user_id, created_at").gte("created_at", since).ilike("content", `%@${myFirstName}%`).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      const newReqs = reqRes.data || [];
      const mentions = chatRes.data || [];
      if (newReqs.length === 0 && mentions.length === 0) {
        localStorage.setItem("synergo_last_opened", today);
        return;
      }

      // Fetch sender names for mentions
      const senderIds = [...new Set(mentions.map((m) => m.user_id))];
      const senders = {};
      if (senderIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, display_name, email").in("id", senderIds);
        (profs || []).forEach((p) => { senders[p.id] = p.display_name || p.email?.split("@")[0] || "Iemand"; });
      }

      setBriefing({
        since: lastOpened || "een week geleden",
        today,
        newRequests: newReqs,
        mentions: mentions.map((m) => ({ ...m, senderName: senders[m.user_id] || "Iemand" })),
      });
    })();
  }, [myId, myFirstName]);

  const dismissBriefing = useCallback(() => {
    localStorage.setItem("synergo_last_opened", todayISO());
    setBriefing(null);
  }, []);

  const value = { push, dismiss, toasts, briefing, dismissBriefing, permission, requestPermission, myFirstName };
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
