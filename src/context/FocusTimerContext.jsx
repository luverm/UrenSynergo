import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

const FocusTimerContext = createContext(null);

function getCurrentPeriod() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (day >= 18) return `${year}-${String(month).padStart(2, "0")}-18`;
  const prev = new Date(year, month - 1, 18);
  return `${prev.getFullYear()}-${String(prev.getMonth()).padStart(2, "0")}-18`;
}

const STORAGE_KEY = "synergo_focus_timer";
const BRAND_COLORS = { elev8: "#FF6B35", faithdrive: "#E8B458", tendercards: "#4CAF7D" };

export function FocusTimerProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(null); // { taskId, taskTitle, brand, startedAt, accumulatedMs, paused, pausedAt }
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.taskId) setState(parsed);
      }
    } catch (e) {}
  }, []);

  // Persist on change
  useEffect(() => {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  }, [state]);

  // Tick every second while running
  useEffect(() => {
    if (state && !state.paused) {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [state?.paused, state?.taskId]);

  const getElapsedMs = useCallback(() => {
    if (!state) return 0;
    const base = state.accumulatedMs || 0;
    if (state.paused) return base;
    return base + (Date.now() - state.startedAt);
  }, [state, tick]);

  const start = useCallback((task) => {
    // If already running a different task, confirm switch
    if (state && state.taskId !== task.id) {
      if (!window.confirm(`Timer loopt al voor "${state.taskTitle}". Wil je switchen?`)) return;
    }
    setState({
      taskId: task.id,
      taskTitle: task.title,
      brand: task.brand,
      startedAt: Date.now(),
      accumulatedMs: 0,
      paused: false,
      pausedAt: null,
    });
  }, [state]);

  const pause = useCallback(() => {
    if (!state || state.paused) return;
    setState({
      ...state,
      accumulatedMs: (state.accumulatedMs || 0) + (Date.now() - state.startedAt),
      paused: true,
      pausedAt: Date.now(),
    });
  }, [state]);

  const resume = useCallback(() => {
    if (!state || !state.paused) return;
    setState({ ...state, paused: false, startedAt: Date.now(), pausedAt: null });
  }, [state]);

  const stop = useCallback(async ({ saveEntry = true, roundTo = 0.25 } = {}) => {
    if (!state) return null;
    const elapsedMs = state.paused ? (state.accumulatedMs || 0) : (state.accumulatedMs || 0) + (Date.now() - state.startedAt);
    const hoursExact = elapsedMs / 3600000;
    let hours = hoursExact;
    if (roundTo) hours = Math.max(roundTo, Math.round(hoursExact / roundTo) * roundTo);

    let entryError = null;
    if (saveEntry && user && hours > 0) {
      const period = getCurrentPeriod();
      const brandColor = BRAND_COLORS[state.brand] || "#FF6B35";
      const entry = {
        task: state.taskTitle,
        hours: +hours.toFixed(2),
        note: `Focus sessie · ${state.brand || ""}`.trim(),
        icon: "⏱️",
        color: brandColor,
        period,
        user_id: user.id,
      };
      const { error } = await supabase.from("entries").insert([entry]);
      if (error) entryError = error.message;
    }

    setState(null);
    return { elapsedMs, hours: +hours.toFixed(2), entryError };
  }, [state, user]);

  const discard = useCallback(() => {
    setState(null);
  }, []);

  const value = {
    active: !!state,
    state,
    start,
    pause,
    resume,
    stop,
    discard,
    getElapsedMs,
    isPaused: state?.paused || false,
  };

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
}

export function useFocusTimer() {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) throw new Error("useFocusTimer must be used within FocusTimerProvider");
  return ctx;
}
