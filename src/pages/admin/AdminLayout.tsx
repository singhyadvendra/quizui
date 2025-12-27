import { useEffect, useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { api } from "../../api";
import type { MeDto } from "../../types";

export default function AdminLayout() {
  const [me, setMe] = useState<MeDto | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setChecking(true);
      try {
        const meResp = await api.me();
        if (!cancelled && meResp && typeof (meResp as any).userId === "number") {
          setMe(meResp);
        } else if (!cancelled) {
          setMe(null);
        }
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const doLogout = async () => {
    try {
      await fetch("/logout", { method: "POST", credentials: "include" });
    } finally {
      setMe(null);
      window.location.assign("/");
    }
  };

  const isLoggedIn = !!me;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Admin</h2>

        <Link to="/admin">Dashboard</Link>
        <Link to="/admin/wizard">Create Quiz Wizard</Link>
        <Link to="/admin/quizzes/new">Create Quiz (simple)</Link>

        {checking ? (
          <span style={{ opacity: 0.8 }}>Checking session...</span>
        ) : isLoggedIn ? (
          <>
            <span style={{ opacity: 0.8 }}>
              {me?.fullName ?? me?.email ?? "User"}
            </span>
            <button type="button" onClick={doLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <a href="/oauth2/authorization/google">Login (Google)</a>
            <a href="/oauth2/authorization/linkedin">Login (LinkedIn)</a>
            <a href="/oauth2/authorization/github">Login (GitHub)</a>
          </>
        )}
      </div>

      <hr style={{ margin: "16px 0" }} />

      <Outlet />
    </div>
  );
}
