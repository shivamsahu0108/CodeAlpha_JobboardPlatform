import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { auth, data } from "../../api";
import { SiteShell } from "../../layouts/SiteLayout";
import { notifyError } from "../../utils/errors";
import type { Role } from "../../types";

interface AuthValues {
  username: string;
  email: string;
  password: string;
  role: Role;
}

export function AuthPage({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const schema = z
    .object({
      username: z.string().trim().min(1, "Enter your username."),
      email: z.string(),
      password: z
        .string()
        .min(
          register ? 8 : 1,
          register ? "Use at least 8 characters." : "Enter your password.",
        ),
      role: z.enum(["Candidate", "Employer"]),
    })
    .superRefine((values, context) => {
      if (register && !z.string().email().safeParse(values.email).success)
        context.addIssue({
          code: "custom",
          path: ["email"],
          message: "Enter a valid email address.",
        });
    });
  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AuthValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "", password: "", role: "Candidate" },
  });
  const submit = handleSubmit(async (values) => {
    try {
      if (register) {
        await auth.register(values);
        toast.success("Account created. Sign in to continue.");
        navigate("/login");
        return;
      }
      const response = await auth.login({
        username: values.username,
        password: values.password,
      });
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);
      const profile = await data.profile();
      const user = {
        username: response.data.username,
        role: profile.data.role,
      };
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new Event("auth:changed"));
      toast.success("Welcome back.");
      navigate(user.role === "Employer" ? "/employer" : "/candidate");
    } catch (error) {
      const details = (
        error as { response?: { data?: Record<string, unknown> } }
      ).response?.data;
      if (details && typeof details === "object") {
        for (const key of ["username", "email", "password"] as const) {
          const message = details[key];
          if (Array.isArray(message) && typeof message[0] === "string")
            setError(key, { message: message[0] });
        }
      }
      notifyError(error);
    }
  });
  return (
    <SiteShell>
      <main className="container auth">
        <div className="card">
          <span className="eyebrow">CODEALPHA JOBS</span>
          <h1>{register ? "Create your account" : "Welcome back"}</h1>
          <form onSubmit={submit} noValidate>
            {register && (
              <>
                <label className="label">
                  Email
                  <input
                    className="input"
                    type="email"
                    autoComplete="email"
                    {...field("email")}
                  />
                  {errors.email && (
                    <small className="field-error">
                      {errors.email.message}
                    </small>
                  )}
                </label>
                <label className="label">
                  I am a
                  <select className="input" {...field("role")}>
                    <option>Candidate</option>
                    <option>Employer</option>
                  </select>
                </label>
              </>
            )}
            <label className="label">
              Username
              <input
                className="input"
                autoComplete="username"
                {...field("username")}
              />
              {errors.username && (
                <small className="field-error">{errors.username.message}</small>
              )}
            </label>
            <label className="label">
              Password
              <input
                className="input"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                {...field("password")}
              />
              {errors.password && (
                <small className="field-error">{errors.password.message}</small>
              )}
            </label>
            <button className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? "Please wait…"
                : register
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
          <p>
            {register ? (
              <Link to="/login">Already registered?</Link>
            ) : (
              <>
                <Link to="/register">Create an account</Link> ·{" "}
                <Link to="/forgot-password">Forgot password?</Link>
              </>
            )}
          </p>
        </div>
      </main>
    </SiteShell>
  );
}

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({
    resolver: zodResolver(
      z.object({ email: z.string().email("Enter a valid email address.") }),
    ),
  });
  return (
    <SiteShell>
      <main className="container auth">
        <div className="card">
          <span className="eyebrow">ACCOUNT RECOVERY</span>
          <h1>Reset your password</h1>
          <p className="muted">
            We’ll email a reset link if an account matches that address.
          </p>
          <form
            onSubmit={handleSubmit(async (values) => {
              try {
                const response = await auth.forgot(values);
                toast.success(response.data.message);
              } catch (error) {
                notifyError(error);
              }
            })}
          >
            <label className="label">
              Email
              <input
                className="input"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <small className="field-error">{errors.email.message}</small>
              )}
            </label>
            <button className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <p>
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </main>
    </SiteShell>
  );
}

export function ResetPasswordPage() {
  const params = new URLSearchParams(useLocation().search);
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ new_password: string }>({
    resolver: zodResolver(
      z.object({
        new_password: z.string().min(8, "Use at least 8 characters."),
      }),
    ),
  });
  return (
    <SiteShell>
      <main className="container auth">
        <div className="card">
          <span className="eyebrow">ACCOUNT RECOVERY</span>
          <h1>Choose a new password</h1>
          {!uid || !token ? (
            <p className="field-error">
              This reset link is incomplete. Request a new one.
            </p>
          ) : (
            <form
              onSubmit={handleSubmit(async (values) => {
                try {
                  const response = await auth.reset({ uid, token, ...values });
                  toast.success(response.data.message);
                  navigate("/login");
                } catch (error) {
                  notifyError(error);
                }
              })}
            >
              <label className="label">
                New password
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  {...register("new_password")}
                />
                {errors.new_password && (
                  <small className="field-error">
                    {errors.new_password.message}
                  </small>
                )}
              </label>
              <button className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
