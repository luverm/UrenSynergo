import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../supabaseClient";

const TEAM_NAMES = ["Lucas", "Raymond", "Shihab"];

function detectTeamName(profile, user) {
  const sources = [
    profile?.display_name,
    user?.email,
    user?.user_metadata?.full_name,
  ].filter(Boolean).map((s) => s.toLowerCase());
  for (const name of TEAM_NAMES) {
    if (sources.some((s) => s.includes(name.toLowerCase()))) return name;
  }
  return "";
}

export function useBadgeCounts(user, profile) {
  const [counts, setCounts] = useState({ tasks: 0, requests: 0, ideas: 0 });
  const channelsRef = useRef([]);
  const userFirst = useMemo(() => detectTeamName(profile, user), [profile, user]);

  const load = async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [tasksRes, reqRes, ideasRes] = await Promise.all([
      userFirst
        ? supabase.from("tasks").select("id", { count: "exact", head: true }).ilike("assigned_to", `%${userFirst}%`).eq("status", "open")
        : Promise.resolve({ count: 0 }),
      supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("ideas").select("id", { count: "exact", head: true }).gte("created_at", yesterday),
    ]);
    setCounts({ tasks: tasksRes.count ?? 0, requests: reqRes.count ?? 0, ideas: ideasRes.count ?? 0 });
  };

  useEffect(() => {
    load();
    const channels = [
      supabase.channel("tasks_elev8").on("broadcast", { event: "tasks_changed" }, load).subscribe(),
      supabase.channel("tasks_faithdrive").on("broadcast", { event: "tasks_changed" }, load).subscribe(),
      supabase.channel("tasks_tendercards").on("broadcast", { event: "tasks_changed" }, load).subscribe(),
      supabase.channel("requests_tendercards").on("broadcast", { event: "requests_changed" }, load).subscribe(),
      supabase.channel("ideas_elev8").on("broadcast", { event: "ideas_changed" }, load).subscribe(),
      supabase.channel("ideas_faithdrive").on("broadcast", { event: "ideas_changed" }, load).subscribe(),
      supabase.channel("ideas_tendercards").on("broadcast", { event: "ideas_changed" }, load).subscribe(),
    ];
    channelsRef.current = channels;
    const interval = setInterval(load, 60000);
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
      clearInterval(interval);
    };
    // eslint-disable-next-line
  }, [userFirst]);

  return counts;
}
