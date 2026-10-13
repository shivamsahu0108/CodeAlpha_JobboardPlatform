import { Link } from "react-router-dom";
import { Briefcase, MapPin } from "lucide-react";
import type { Application } from "../../api";
import type { Job } from "../../types";

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="card empty">
      <Briefcase />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function Stat({ n, t }: { n: string; t: string }) {
  return (
    <div className="card stat">
      <b>{n}</b>
      <span>{t}</span>
    </div>
  );
}

export function Field({
  l,
  v,
  set,
  type = "text",
  required = true,
  error,
}: {
  l: string;
  v: string;
  set: (value: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="label">
      {l}
      <input
        required={required}
        className="input"
        type={type}
        value={v}
        onChange={(event) => set(event.target.value)}
      />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export function JobCard({ job }: { job: Job }) {
  return (
    <Link to={`/jobs/${job.id}`} className="card job">
      <div className="job-card-top">
        <span className="company-mark" aria-hidden="true">
          {job.company.slice(0, 1).toUpperCase()}
        </span>
        <span className="pill">{job.job_type}</span>
      </div>
      <h3>{job.title}</h3>
      <b>{job.company}</b>
      <p>
        <MapPin size={14} /> {job.location}
      </p>
      <div className="job-card-bottom">
        <strong>
          {job.salary
            ? `₹${Number(job.salary).toLocaleString()}`
            : "Salary not disclosed"}
        </strong>
        <span className="job-open-link" aria-hidden="true">
          ↗
        </span>
      </div>
    </Link>
  );
}

export function JobTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="card tablewrap">
      <table>
        <thead>
          <tr>
            <th>Role</th>
            <th>Status</th>
            <th>Applicants</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>{job.title}</td>
              <td>{job.status}</td>
              <td>{job.applications_count || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ApplicationTable({ apps }: { apps: Application[] }) {
  return (
    <div className="card tablewrap">
      <table>
        <thead>
          <tr>
            <th>Job</th>
            <th>Resume</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((application) => (
            <tr key={application.id}>
              <td>{application.job}</td>
              <td>{application.resume ?? "—"}</td>
              <td>
                <span className="pill">{application.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
