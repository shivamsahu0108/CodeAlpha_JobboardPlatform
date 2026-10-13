import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  auth,
  data,
  jobs,
  type Application,
  type Profile as ProfileData,
} from "../../api";
import {
  ApplicationTable,
  Empty,
  Field,
  JobTable,
  Stat,
} from "../../components/common/PortalUI";
import { notifyError, responseFieldErrors } from "../../utils/errors";
import type { Job, Role } from "../../types";

export function DashboardOverview({ role }: { role: Role }) {
  const query = useQuery<{ total_jobs: number; jobs: Job[] } | Application[]>({
    queryKey: ["dashboard", role],
    queryFn: () =>
      role === "Employer"
        ? data.dashboard().then((response) => response.data)
        : data.applications().then((response) => response.data),
  });
  const saved = useQuery({
    queryKey: ["saved"],
    queryFn: () => jobs.saved().then((response) => response.data),
    enabled: role === "Candidate",
  });
  const resumes = useQuery({
    queryKey: ["resumes"],
    queryFn: () => data.resumes().then((response) => response.data),
    enabled: role === "Candidate",
  });
  if (query.isLoading) return <p className="muted">Loading dashboard…</p>;
  if (query.isError || !query.data)
    return (
      <p className="field-error">Dashboard information could not be loaded.</p>
    );
  if (role === "Employer") {
    const dashboard = query.data as { total_jobs: number; jobs: Job[] };
    const applicationCount = dashboard.jobs.reduce(
      (total, job) => total + (job.applications_count || 0),
      0,
    );
    return (
      <>
        <h1>Hiring dashboard</h1>
        <div className="stats">
          <Stat n={String(dashboard.total_jobs)} t="Total jobs" />
          <Stat n={String(applicationCount)} t="Applications" />
        </div>
        <JobTable jobs={dashboard.jobs} />
      </>
    );
  }
  const applications = query.data as Application[];
  return (
    <>
      <h1>Your job search</h1>
      <div className="stats">
        <Stat n={String(applications.length)} t="Applications sent" />
        <Stat n={String(saved.data?.length ?? 0)} t="Saved roles" />
        <Stat n={String(resumes.data?.length ?? 0)} t="Resumes on file" />
      </div>
      <div className="section-title">
        <h2>Application activity</h2>
        <Link to="/candidate/applications">View all</Link>
      </div>
      {applications.length ? (
        <ApplicationTable apps={applications.slice(0, 5)} />
      ) : (
        <Empty
          title="Your next move starts here"
          text="Browse open positions and submit an application to start tracking progress."
        />
      )}
      <Link className="btn btn-primary m-5" to="/jobs">
        Browse open roles
      </Link>
    </>
  );
}

export function ProfilePage() {
  const query = useQuery({
    queryKey: ["profile"],
    queryFn: () => data.profile().then((response) => response.data),
  });
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const profile = query.data;
  const value = (key: keyof ProfileData) =>
    values[key] ?? String(profile?.[key] ?? "");
  if (query.isLoading) return <p className="muted">Loading profile…</p>;
  if (query.isError || !profile)
    return <p className="field-error">Profile could not be loaded.</p>;
  const fields: Array<{
    key: keyof ProfileData;
    label: string;
    type?: string;
  }> = [
    { key: "first_name", label: "First name" },
    { key: "last_name", label: "Last name" },
    { key: "email", label: "Email", type: "email" },
    ...(profile.role === "Candidate"
      ? [
          { key: "phone" as const, label: "Phone" },
          { key: "skills" as const, label: "Skills" },
          {
            key: "experience" as const,
            label: "Years of experience",
            type: "number",
          },
        ]
      : [
          { key: "company_name" as const, label: "Company name" },
          { key: "company_description" as const, label: "Company description" },
          {
            key: "company_website" as const,
            label: "Company website",
            type: "url",
          },
        ]),
  ];
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const common = {
      first_name: value("first_name"),
      last_name: value("last_name"),
      ...(value("email") !== profile.email ? { email: value("email") } : {}),
    };
    const details =
      profile.role === "Candidate"
        ? {
            phone: value("phone"),
            skills: value("skills"),
            experience: Number(value("experience") || 0),
          }
        : {
            company_name: value("company_name"),
            description: value("company_description"),
            website: value("company_website"),
          };
    try {
      await data.updateProfile({ ...common, ...details });
      setServerErrors({});
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated.");
    } catch (error) {
      setServerErrors(responseFieldErrors(error));
      notifyError(error);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <span className="eyebrow">ACCOUNT</span>
      <h1>{profile.role === "Employer" ? "Company profile" : "My profile"}</h1>
      <form className="card form-grid" onSubmit={submit}>
        {fields.map(({ key, label, type }) => (
          <Field
            key={key}
            l={label}
            v={value(key)}
            type={type}
            error={
              serverErrors[
                key === "company_description"
                  ? "description"
                  : key === "company_website"
                    ? "website"
                    : key
              ]
            }
            required={
              key === "email" || key === "company_name" || key === "experience"
            }
            set={(next) => {
              setServerErrors({});
              setValues((current) => ({ ...current, [key]: next }));
            }}
          />
        ))}
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </>
  );
}

export function NotificationsPage() {
  const query = useQuery({
    queryKey: ["notes"],
    queryFn: () => data.notifications().then((response) => response.data),
  });
  const queryClient = useQueryClient();
  const unread = useQuery({
    queryKey: ["unread"],
    queryFn: () => data.unread().then((response) => response.data.unread_count),
  });
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">INBOX</span>
          <h1>Notifications</h1>
        </div>
        <span className="pill">{unread.data ?? 0} unread</span>
      </div>
      {query.isLoading ? (
        <p className="muted">Loading notifications…</p>
      ) : query.isError ? (
        <p className="field-error">Notifications could not be loaded.</p>
      ) : query.data?.length ? (
        query.data.map((notification) => (
          <div
            className={`card row notification ${notification.read ? "is-read" : "is-unread"}`}
            key={notification.id}
          >
            <div>
              <p>{notification.message}</p>
              <small className="muted">
                {new Date(notification.created_at).toLocaleString()}
              </small>
            </div>
            {!notification.read && (
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  try {
                    await data.read(notification.id);
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ["notes"] }),
                      queryClient.invalidateQueries({ queryKey: ["unread"] }),
                    ]);
                  } catch (error) {
                    notifyError(error);
                  }
                }}
              >
                Mark read
              </button>
            )}
          </div>
        ))
      ) : (
        <Empty
          title="You’re all caught up"
          text="New application updates and account notices will appear here."
        />
      )}
    </>
  );
}

export function PasswordPage() {
  const navigate = useNavigate();
  const schema = z
    .object({
      old_password: z.string().min(1, "Enter your current password."),
      new_password: z.string().min(8, "Use at least 8 characters."),
      confirm: z.string(),
    })
    .refine((values) => values.new_password === values.confirm, {
      path: ["confirm"],
      message: "Passwords do not match.",
    });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ old_password: string; new_password: string; confirm: string }>({
    resolver: zodResolver(schema),
  });
  return (
    <>
      <span className="eyebrow">SECURITY</span>
      <h1>Change password</h1>
      <form
        className="card password-form"
        onSubmit={handleSubmit(async ({ old_password, new_password }) => {
          try {
            const response = await auth.change({ old_password, new_password });
            toast.success(response.data.message);
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
            localStorage.removeItem("user");
            window.dispatchEvent(new Event("auth:changed"));
            navigate("/login", { replace: true });
          } catch (error) {
            notifyError(error);
          }
        })}
      >
        <label className="label">
          Current password
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            {...register("old_password")}
          />
          {errors.old_password && (
            <small className="field-error">{errors.old_password.message}</small>
          )}
        </label>
        <label className="label">
          New password
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            {...register("new_password")}
          />
          {errors.new_password && (
            <small className="field-error">{errors.new_password.message}</small>
          )}
        </label>
        <label className="label">
          Confirm new password
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            {...register("confirm")}
          />
          {errors.confirm && (
            <small className="field-error">{errors.confirm.message}</small>
          )}
        </label>
        <button className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}
