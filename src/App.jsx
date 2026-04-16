import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Chat from "./pages/Chat";
import Sales from "./pages/Sales";
import Settings from "./pages/Settings";
import Family from "./pages/Family";
import MyTasks from "./pages/MyTasks";
import Holding from "./pages/Holding";

function Spinner() {
  return (
    <div style={{ minHeight: "100vh", background: "#0E0E10", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 32, height: 32, border: "2px solid rgba(255,255,255,0.06)",
        borderTopColor: "#FF6B35", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminGuard({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

// Viewers see the Family page instead of the Dashboard
function DashboardOrFamily() {
  const { isViewer } = useAuth();
  return isViewer ? <Family /> : <Dashboard />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardOrFamily />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/holding" element={<Holding />} />
        <Route path="/mijn-taken" element={<MyTasks />} />
        <Route path="/family" element={<Family />} />
        <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
        <Route path="/settings" element={<AdminGuard><Settings /></AdminGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
