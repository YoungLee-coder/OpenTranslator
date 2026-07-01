import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function RootLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <nav className="topnav">
        <Link to="/" className="brand">
          OpenTranslator
        </Link>
        <div className="nav-links">
          <Link to="/">翻译</Link>
          {user ? (
            <>
              <Link to="/dashboard">控制台</Link>
              <button className="link-btn" type="button" onClick={() => void logout()}>
                退出
              </button>
            </>
          ) : (
            <Link to="/login">登录</Link>
          )}
        </div>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
