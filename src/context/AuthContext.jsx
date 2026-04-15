import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const ADMIN_EMAILS = ["admin@gmail.com", "lucasvermair@gmail.com"];

// Viewers can see a specific person's hours (read-only, no admin access)
// Map: viewer email → email of the user whose hours they can see
const VIEWER_CONFIG = {
  "l.vermaire@synergo.com": "lucasvermair@gmail.com",
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const isAdmin = profile?.is_admin || ADMIN_EMAILS.includes(user?.email);
  const viewerTargetEmail = user?.email ? VIEWER_CONFIG[user.email] : null;
  const isViewer = !!viewerTargetEmail;

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, isAdmin, isViewer, viewerTargetEmail, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
