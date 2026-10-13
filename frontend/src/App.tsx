import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RoleGate, DashboardLayout } from "./layouts/SiteLayout";
import {
  AuthPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from "./pages/auth/AuthPages";
import {
  ApplicationsPage,
  ResumeManagerPage,
  SavedJobsPage,
} from "./pages/candidate/CandidatePages";
import {
  DashboardOverview,
  NotificationsPage,
  ProfilePage,
  PasswordPage,
} from "./pages/dashboard/DashboardPages";
import {
  EmployerApplicationsPage,
  EmployerJobsPage,
  JobFormPage,
} from "./pages/employer/EmployerPages";
import { Home, JobDetails, Jobs } from "./pages/public/JobPages";
import type { Role } from "./types";

function protectedPage(role: Role, page: ReactNode) {
  return (
    <RoleGate role={role}>
      <DashboardLayout role={role}>{page}</DashboardLayout>
    </RoleGate>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs/:id" element={<JobDetails />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage register />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/reset-password/" element={<ResetPasswordPage />} />
      <Route
        path="/candidate"
        element={protectedPage(
          "Candidate",
          <DashboardOverview role="Candidate" />,
        )}
      />
      <Route
        path="/candidate/profile"
        element={protectedPage("Candidate", <ProfilePage />)}
      />
      <Route
        path="/candidate/saved"
        element={protectedPage("Candidate", <SavedJobsPage />)}
      />
      <Route
        path="/candidate/applications"
        element={protectedPage("Candidate", <ApplicationsPage />)}
      />
      <Route
        path="/candidate/resumes"
        element={protectedPage("Candidate", <ResumeManagerPage />)}
      />
      <Route
        path="/candidate/notifications"
        element={protectedPage("Candidate", <NotificationsPage />)}
      />
      <Route
        path="/candidate/password"
        element={protectedPage("Candidate", <PasswordPage />)}
      />
      <Route
        path="/employer"
        element={protectedPage(
          "Employer",
          <DashboardOverview role="Employer" />,
        )}
      />
      <Route
        path="/employer/profile"
        element={protectedPage("Employer", <ProfilePage />)}
      />
      <Route
        path="/employer/post"
        element={protectedPage("Employer", <JobFormPage />)}
      />
      <Route
        path="/employer/jobs"
        element={protectedPage("Employer", <EmployerJobsPage />)}
      />
      <Route
        path="/employer/jobs/:id/edit"
        element={protectedPage("Employer", <JobFormPage />)}
      />
      <Route
        path="/employer/applicants"
        element={protectedPage("Employer", <EmployerApplicationsPage />)}
      />
      <Route
        path="/employer/notifications"
        element={protectedPage("Employer", <NotificationsPage />)}
      />
      <Route
        path="/employer/password"
        element={protectedPage("Employer", <PasswordPage />)}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
