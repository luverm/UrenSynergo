import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "zojuist";
  if (mins < 60) return `${mins}m geleden`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}u geleden`;
  const days = Math.floor(hrs / 24);
  return `${days}d geleden`;
}

function isImage(type) {
  return type && type.startsWith("image/");
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#FF6B35", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

function Avatar({ url, name, size = 32 }) {
  if (url) {
    return <div style={{ width: size, height: size, borderRadius: 2, background: `url(${url}) center/cover`, flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 2, background: "rgba(255,107,53,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontSize: size * 0.4, color: "#FF6B35", flexShrink: 0 }}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

export default function GroupDetail() {
  const { id } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState("");
  const [postFiles, setPostFiles] = useState([]);
  const [posting, setPosting] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [error, setError] = useState(null);

  const isOwner = group?.owner_id === user.id;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [groupRes, membersRes, postsRes] = await Promise.all([
      supabase.from("groups").select("*").eq("id", id).single(),
      supabase.from("group_members").select("*").eq("group_id", id),
      supabase.from("posts").select("*, post_files(*)").eq("group_id", id).order("created_at", { ascending: false }),
    ]);

    setGroup(groupRes.data);
    setMembers(membersRes.data || []);
    setPosts(postsRes.data || []);

    const userIds = new Set([
      ...(membersRes.data || []).map((m) => m.user_id),
      ...(postsRes.data || []).map((p) => p.user_id),
    ]);

    if (userIds.size > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, email")
        .in("id", [...userIds]);
      const map = {};
      (profileData || []).forEach((p) => { map[p.id] = p; });
      setProfiles(map);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchAllProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, display_name, email, avatar_url");
    setAllProfiles(data || []);
  };

  const handlePost = async () => {
    if (!postContent.trim() && postFiles.length === 0) return;
    setPosting(true);
    setError(null);
    try {
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert([{ group_id: id, user_id: user.id, content: postContent.trim() }])
        .select()
        .single();
      if (postError) throw postError;

      for (const file of postFiles) {
        const path = `${id}/${post.id}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("post-files")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("post-files").getPublicUrl(path);

        await supabase.from("post_files").insert([{
          post_id: post.id,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
        }]);
      }

      setPostContent("");
      setPostFiles([]);
      await fetchData();
    } catch (e) {
      setError(e.message || "Kon bericht niet plaatsen.");
    } finally {
      setPosting(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setError(null);
    const target = allProfiles.find((p) => p.email === inviteEmail.trim() || p.display_name === inviteEmail.trim());
    if (!target) { setError("Gebruiker niet gevonden."); return; }
    if (members.some((m) => m.user_id === target.id)) { setError("Al lid van dit project."); return; }

    const { error: addError } = await supabase.from("group_members").insert([{ group_id: id, user_id: target.id }]);
    if (addError) { setError(addError.message); return; }

    setInviteEmail("");
    await fetchData();
  };

  const handleDeletePost = async (postId) => {
    await supabase.from("posts").delete().eq("id", postId);
    await fetchData();
  };

  const handleFileSelect = (e) => {
    setPostFiles([...postFiles, ...Array.from(e.target.files)]);
    e.target.value = "";
  };

  const removeFile = (idx) => {
    setPostFiles(postFiles.filter((_, i) => i !== idx));
  };

  const inp = {
    width: "100%", padding: "14px 18px", borderRadius: 2,
    border: "1px solid rgba(255,107,53,0.15)", background: "rgba(255,255,255,0.03)",
    color: "#F5F3EE", fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };

  if (loading) return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: 40 }}>
      <Spinner />
    </div>
  );

  if (!group) return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "60px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 15, color: "#6E6E72" }}>Project niet gevonden</div>
      <button onClick={() => navigate("/groups")} style={{ marginTop: 16, background: "none", border: "none", color: "#FF6B35", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Terug naar projecten</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <style>{`
        textarea:focus { border-color: rgba(255,107,53,0.5) !important; }
        input:focus { border-color: rgba(255,107,53,0.5) !important; }
        @media (max-width: 600px) {
          .gd-invite { flex-direction: column !important; }
          .gd-post-actions { flex-direction: column !important; }
        }
      `}</style>

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Breadcrumb + members */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6E6E72", fontWeight: 300 }}>
            <button onClick={() => navigate("/groups")} style={{ background: "none", border: "none", color: "#6E6E72", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, padding: 0 }}>Projecten</button>
            <span>/</span>
            <span style={{ color: "#F5F3EE", fontWeight: 500 }}>{group.name}</span>
          </div>
          <button onClick={() => { setShowMembers(!showMembers); if (!showMembers) fetchAllProfiles(); }} style={{
            padding: "6px 14px", borderRadius: 2, border: "1px solid rgba(255,107,53,0.2)",
            background: showMembers ? "rgba(255,107,53,0.06)" : "transparent", color: "#FF6B35", fontSize: 11, fontWeight: 500,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.5,
          }}>
            {members.length} {members.length === 1 ? "lid" : "leden"}
          </button>
        </div>

        {/* Group header */}
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F5F3EE", letterSpacing: "-0.01em" }}>{group.name}</div>
          {group.description && <div style={{ fontSize: 14, color: "#6E6E72", fontWeight: 300, marginTop: 6 }}>{group.description}</div>}
          <div style={{ width: 40, height: 1, background: "#FF6B35", margin: "14px 0", opacity: 0.3 }} />
        </div>

        {error && (
          <div style={{ margin: "0 0 16px", padding: "14px 18px", borderRadius: 2, background: "rgba(204,82,40,0.08)", border: "1px solid rgba(204,82,40,0.15)", color: "#CC5228", fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#CC5228", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* Members panel */}
        {showMembers && (
          <div style={{ padding: 20, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20, animation: "fadeUp 0.3s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Leden</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {members.map((m) => {
                const p = profiles[m.user_id];
                return (
                  <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar url={p?.avatar_url} name={p?.display_name || p?.email} size={28} />
                    <span style={{ fontSize: 14, fontWeight: 400 }}>{p?.display_name || p?.email?.split("@")[0]}</span>
                    <span style={{ fontSize: 11, color: "#6E6E72", marginLeft: "auto" }}>{m.role === "owner" ? "Eigenaar" : "Lid"}</span>
                  </div>
                );
              })}
            </div>
            {isOwner && (
              <div className="gd-invite" style={{ display: "flex", gap: 8 }}>
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="E-mail of naam" style={{ ...inp, flex: 1, padding: "10px 14px", fontSize: 13 }} />
                <button onClick={handleInvite} style={{
                  padding: "10px 16px", borderRadius: 2, border: "none", background: "#FF6B35", color: "#0E0E10",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
                }}>
                  Uitnodigen
                </button>
              </div>
            )}
          </div>
        )}

        {/* New post */}
        <div style={{ padding: 20, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 24, animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Schrijf een update..."
            rows={3}
            style={{ ...inp, resize: "vertical", minHeight: 70, marginBottom: 12 }}
          />
          {postFiles.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {postFiles.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 2, background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.15)", fontSize: 12, color: "#FF9B73" }}>
                  <span>{f.name}</span>
                  <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", color: "#CC5228", cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="gd-post-actions" style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fileRef.current?.click()} style={{
              padding: "10px 16px", borderRadius: 2, border: "1px solid rgba(255,107,53,0.2)",
              background: "transparent", color: "#FF6B35", fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              + Bestanden
            </button>
            <input ref={fileRef} type="file" multiple onChange={handleFileSelect} style={{ display: "none" }} />
            <button onClick={handlePost} disabled={(!postContent.trim() && postFiles.length === 0) || posting} style={{
              flex: 1, padding: "10px", borderRadius: 2, border: "none",
              background: (postContent.trim() || postFiles.length > 0) && !posting ? "#FF6B35" : "rgba(255,255,255,0.04)",
              color: (postContent.trim() || postFiles.length > 0) && !posting ? "#0E0E10" : "rgba(255,255,255,0.15)",
              fontSize: 13, fontWeight: 600, cursor: (postContent.trim() || postFiles.length > 0) && !posting ? "pointer" : "default",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.25s",
            }}>
              {posting ? "Plaatsen..." : "Plaatsen"}
            </button>
          </div>
        </div>

        {/* Posts feed */}
        {posts.length > 0 && (
          <div style={{ animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>Updates</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {posts.map((post) => {
                const author = profiles[post.user_id];
                const files = post.post_files || [];
                return (
                  <div key={post.id} style={{ padding: "18px 20px", borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    {/* Author row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <Avatar url={author?.avatar_url} name={author?.display_name || author?.email} size={30} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{author?.display_name || author?.email?.split("@")[0]}</span>
                        <span style={{ fontSize: 11, color: "#6E6E72", marginLeft: 8 }}>{timeAgo(post.created_at)}</span>
                      </div>
                      {post.user_id === user.id && (
                        <button onClick={() => handleDeletePost(post.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
                      )}
                    </div>
                    {/* Content */}
                    {post.content && <div style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.7, color: "#F5F3EE", whiteSpace: "pre-wrap", marginBottom: files.length > 0 ? 14 : 0 }}>{post.content}</div>}
                    {/* Files */}
                    {files.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {files.map((f) => (
                          isImage(f.file_type) ? (
                            <img key={f.id} src={f.file_url} alt={f.file_name} style={{ maxWidth: "100%", borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)" }} />
                          ) : (
                            <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer" style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 2,
                              background: "rgba(255,107,53,0.04)", border: "1px solid rgba(255,107,53,0.12)",
                              color: "#FF6B35", textDecoration: "none", fontSize: 13, fontWeight: 400,
                            }}>
                              📎 {f.file_name}
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {posts.length === 0 && (
          <div style={{ padding: "48px 20px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>💬</div>
            <div style={{ fontSize: 15, color: "#6E6E72", fontWeight: 400 }}>Nog geen updates</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.15)", marginTop: 4, fontWeight: 300 }}>Deel je eerste update met het team</div>
          </div>
        )}
      </div>
    </div>
  );
}
