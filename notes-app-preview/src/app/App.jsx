import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import GlobalStyle from "../components/GlobalStyle.jsx";
import ThreeBackground from "../components/ThreeBackground.jsx";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import AdminLoginModal from "../features/auth/AdminLoginModal.jsx";
import { StudentLoginPage, StudentLoginModal } from "../features/auth/StudentAuthModal.jsx";
import { SkeletonGrid } from "../components/Skeleton.jsx";
import { useOffline } from "../hooks/useOffline.js";

// Lazy-load all pages → minimal initial bundle
const HomePage          = lazy(() => import("../features/home/HomePage.jsx"));
const SubjectsPage      = lazy(() => import("../features/subjects/SubjectsPage.jsx"));
const SubjectDetailPage = lazy(() => import("../features/subjects/SubjectDetailPage.jsx"));
const NotesPage         = lazy(() => import("../features/notes/NotesPage.jsx"));
const AdminPage         = lazy(() => import("../features/admin/AdminPage.jsx"));

function PageFallback() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "130px 40px 60px", position: "relative", zIndex: 10 }}>
      <SkeletonGrid count={6} height={220} />
    </div>
  );
}

/** Layout wrapper for authenticated pages: Navbar + Footer. */
function AppLayout() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#05050f" }}>
      <Navbar />
      <main style={{ flex: 1, position: "relative", zIndex: 10 }}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

/** Redirects to /login if student is not authenticated. */
function ProtectedRoute() {
  const { student } = useApp();
  if (!student) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Redirects to / if not admin. */
function AdminRoute() {
  const { isAdmin } = useApp();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

function OfflineBanner() {
  const { isOnline } = useOffline();
  if (isOnline) return null;
  return (
    <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "rgba(239,68,68,0.95)", color: "#fff", padding: "10px 22px", borderRadius: 30, fontSize: 13, fontWeight: 700, zIndex: 500, backdropFilter: "blur(10px)", boxShadow: "0 8px 24px rgba(239,68,68,0.4)" }}>
      📶 You're offline — some features may not work
    </div>
  );
}

/** Redirects already-logged-in students away from /login → / */
function LoginRoute() {
  const { student } = useApp();
  if (student) return <Navigate to="/" replace />;
  return (
    <div style={{ minHeight: "100vh", background: "#05050f" }}>
      <StudentLoginPage />
    </div>
  );
}

/**
 * Root component. All providers are set up in main.jsx.
 * Uses React Router v6 nested routes with lazy loading.
 */
export default function App() {
  const { showLogin, showStudentLogin } = useApp();

  return (
    <>
      <GlobalStyle />
      <ThreeBackground />
      <ErrorBoundary>
        <Routes>
          {/* Public: login page — redirects to / if already logged in */}
          <Route path="/login" element={<LoginRoute />} />

          {/* Authenticated layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index      element={<HomePage />} />
              <Route path="notes"         element={<NotesPage />} />
              <Route path="subjects"      element={<SubjectsPage />} />
              <Route path="subjects/:id"  element={<SubjectDetailPage />} />

              {/* Admin-only sub-tree */}
              <Route element={<AdminRoute />}>
                <Route path="admin" element={<AdminPage />} />
              </Route>

              {/* 404 → home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>

        {showLogin        && <AdminLoginModal />}
        {showStudentLogin && <StudentLoginModal />}
        <OfflineBanner />
      </ErrorBoundary>
    </>
  );
}
