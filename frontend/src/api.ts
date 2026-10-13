import axios, { type AxiosError } from "axios";
import type { Job, Role } from "./types";

const accessKey = "access";
const refreshKey = "refresh";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const access = localStorage.getItem(accessKey);
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const hadAccessToken = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && hadAccessToken) {
      localStorage.removeItem(accessKey);
      localStorage.removeItem(refreshKey);
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  },
);

export type Profile = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  phone?: string;
  skills?: string;
  experience?: number;
  company_name?: string;
  company_description?: string;
  company_website?: string;
};

export type Resume = { id: number; file: string; uploaded_at: string };
export type Application = {
  id: number;
  job: number;
  candidate: number;
  resume: number | null;
  status: "Applied" | "Under Review" | "Shortlisted" | "Rejected" | "Selected";
  applied_at: string;
};
export type SavedJob = {
  saved_id: number;
  job_id: number;
  title: string;
  company: string;
  location: string;
  salary: number | null;
  job_type: string;
  saved_at: string;
};
export type Notification = {
  id: number;
  message: string;
  read: boolean;
  created_at: string;
};
export type JobPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Job[];
};

export const auth = {
  register: (body: {
    username: string;
    email: string;
    password: string;
    role: Role;
  }) =>
    api.post<{ message: string; username: string; role: Role }>(
      "/register/",
      body,
    ),
  login: (body: { username: string; password: string }) =>
    api.post<{
      message: string;
      username: string;
      access: string;
      refresh: string;
    }>("/login/", body),
  change: (body: { old_password: string; new_password: string }) =>
    api.post<{ message: string }>("/change-password/", body),
  forgot: (body: { email: string }) =>
    api.post<{ message: string }>("/forgot-password/", body),
  reset: (body: { uid: string; token: string; new_password: string }) =>
    api.post<{ message: string }>("/reset-password/", body),
};

export const jobs = {
  list: (
    params: {
      search?: string;
      location?: string;
      job_type?: string;
      min_salary?: number | string;
      max_salary?: number | string;
      page?: number;
    } = {},
  ) => api.get<JobPage>("/jobs/", { params }),
  get: (id: string | number) => api.get<Job>(`/jobs/${id}/`),
  create: (body: Partial<Job>) => api.post<Job>("/jobs/create/", body),
  edit: (id: number, body: Partial<Job>) =>
    api.patch<Job>(`/jobs/${id}/edit/`, body),
  close: (id: number) => api.patch(`/jobs/${id}/close/`),
  reopen: (id: number) => api.patch(`/jobs/${id}/reopen/`),
  remove: (id: number) => api.delete(`/jobs/${id}/delete/`),
  apply: (id: number, body: { job: number; resume: number | null }) =>
    api.post<Application>(`/jobs/${id}/apply/`, body),
  save: (id: number) => api.post(`/jobs/${id}/save/`),
  saved: () => api.get<SavedJob[]>("/jobs/saved/"),
  unsave: (savedId: number) => api.delete(`/jobs/${savedId}/unsave/`),
};

export const data = {
  applications: () => api.get<Application[]>("/applications/my/"),
  employerApplications: () => api.get<Application[]>("/employer/applications/"),
  status: (id: number, status: Application["status"]) =>
    api.patch<{
      message: string;
      application_id: number;
      status: Application["status"];
    }>(`/applications/${id}/status/`, { status }),
  resumes: () => api.get<Resume[]>("/resumes/my/"),
  upload: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return api.post<Resume>("/resumes/upload/", body);
  },
  deleteResume: (id: number) => api.delete(`/resumes/${id}/delete/`),
  dashboard: () =>
    api.get<{ total_jobs: number; jobs: Job[] }>("/employer/dashboard/"),
  profile: () => api.get<Profile>("/profile/me/"),
  updateProfile: (body: Partial<Profile>) =>
    api.patch<{ message: string }>("/profile/update/", body),
  notifications: () => api.get<Notification[]>("/notifications/my/"),
  read: (id: number) => api.patch(`/notifications/${id}/read/`),
  unread: () =>
    api.get<{ unread_count: number }>("/notifications/unread-count/"),
};

export function errorText(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data;
    if (response && typeof response === "object") {
      const messages = Object.values(response as Record<string, unknown>)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === "string");
      if (messages.length) return messages.join(" ");
    }
    return error.message || "The server could not complete this request.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
