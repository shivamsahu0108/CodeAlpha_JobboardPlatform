import type { ReactNode } from "react";
import { Link, NavLink, Navigate, useNavigate } from "react-router-dom";
import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  Users,
} from "lucide-react";
import type { Role } from "../types";
import { useStoredUser } from "../hooks/useStoredUser";

export function Header() {
  const navigate = useNavigate();
  const user = useStoredUser();
  return (
    <header>
      <div className="container nav">
        <Link to="/" className="brand" aria-label="CodeAlpha Jobs home">
          <span className="brand-mark" aria-hidden="true">
            CA
          </span>
          <span className="brand-name">
            CodeAlpha<span>Jobs</span>
          </span>
        </Link>
        <nav>
          <Link to="/jobs">Find jobs</Link>
          {user ? (
            <>
              <Link to={user.role === "Employer" ? "/employer" : "/candidate"}>
                Dashboard
              </Link>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  localStorage.removeItem("access");
                  localStorage.removeItem("refresh");
                  localStorage.removeItem("user");
                  window.dispatchEvent(new Event("auth:changed"));
                  navigate("/");
                }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </>
          ) : (
            <Link className="btn btn-primary" to="/login">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <footer>
        <div className="container">
          © {new Date().getFullYear()} CodeAlpha Jobs · Find work that moves you
          forward.
        </div>
      </footer>
    </>
  );
}

const candidateItems = [
  ["Overview", "/candidate", LayoutDashboard],
  ["Profile", "/candidate/profile", Users],
  ["Saved jobs", "/candidate/saved", Bookmark],
  ["Applications", "/candidate/applications", FileText],
  ["Resumes", "/candidate/resumes", FileText],
  ["Notifications", "/candidate/notifications", Bell],
  ["Password", "/candidate/password", Lock],
] as const;
const employerItems = [
  ["Overview", "/employer", LayoutDashboard],
  ["Profile", "/employer/profile", Building2],
  ["Post a job", "/employer/post", Plus],
  ["Manage jobs", "/employer/jobs", Briefcase],
  ["Applicants", "/employer/applicants", Users],
  ["Notifications", "/employer/notifications", Bell],
  ["Password", "/employer/password", Lock],
] as const;

export function DashboardLayout({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const items = role === "Candidate" ? candidateItems : employerItems;
  return (
    <>
      <Header />
      <div className="container dash">
        <aside className="card">
          <b>{role} portal</b>
          {items.map(([label, to, Icon]) => (
            <NavLink
              end={to === `/${role.toLowerCase()}`}
              className="sidebar-link"
              to={to}
              key={to}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </aside>
        <main>{children}</main>
      </div>
    </>
  );
}

export function RoleGate({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const user = useStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
