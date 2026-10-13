import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { data, jobs, type Application } from "../../api";
import { Empty, Field } from "../../components/common/PortalUI";
import { notifyError, responseFieldErrors } from "../../utils/errors";
import type { Job } from "../../types";

const salaryText = (salary: number | null) =>
  salary ? `₹${salary.toLocaleString()}` : "Salary not disclosed";
type JobFormValues = Omit<Partial<Job>, "salary"> & {
  salary?: number | string | null;
};

export function JobFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const existing = useQuery({
    queryKey: ["employer-job-edit", id],
    queryFn: async () =>
      (await data.dashboard()).data.jobs.find((job) => job.id === Number(id)),
    enabled: Boolean(id),
  });
  const [form, setForm] = useState<JobFormValues>({
    job_type: "Full-time",
    title: "",
    location: "",
    description: "",
    salary: null,
  });
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (existing.data) setForm({ ...existing.data });
  }, [existing.data]);
  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const body = {
      ...form,
      salary: form.salary === "" ? null : Number(form.salary),
    };
    try {
      if (id) await jobs.edit(Number(id), body);
      else await jobs.create(body);
      await queryClient.invalidateQueries({ queryKey: ["employer-dashboard"] });
      toast.success(id ? "Listing updated." : "Opening published.");
      navigate("/employer/jobs");
    } catch (error) {
      setServerErrors(responseFieldErrors(error));
      notifyError(error);
    } finally {
      setSaving(false);
    }
  };
  if (id && existing.isLoading)
    return <p className="muted">Loading listing…</p>;
  if (id && (existing.isError || !existing.data))
    return (
      <p className="field-error">
        This listing could not be loaded or is not available to your account.
      </p>
    );
  return (
    <>
      <span className="eyebrow">EMPLOYER WORKSPACE</span>
      <h1>{id ? "Edit opening" : "Post a job"}</h1>
      <form className="card form-grid job-form" onSubmit={submit}>
        <Field
          l="Title"
          v={form.title || ""}
          error={serverErrors.title}
          set={(value) => update("title", value)}
        />
        <Field
          l="Location"
          v={form.location || ""}
          error={serverErrors.location}
          set={(value) => update("location", value)}
        />
        <Field
          l="Annual salary (optional)"
          v={String(form.salary ?? "")}
          type="number"
          required={false}
          error={serverErrors.salary}
          set={(value) => update("salary", value)}
        />
        <label className="label">
          Type
          <select
            className="input"
            value={form.job_type}
            onChange={(event) => update("job_type", event.target.value)}
          >
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Internship</option>
            <option>Contract</option>
          </select>
          {serverErrors.job_type && (
            <small className="field-error">{serverErrors.job_type}</small>
          )}
        </label>
        <label className="label full">
          Description
          <textarea
            required
            className="input"
            rows={7}
            value={form.description || ""}
            onChange={(event) => update("description", event.target.value)}
          />
          {serverErrors.description && (
            <small className="field-error">{serverErrors.description}</small>
          )}
        </label>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : id ? "Save changes" : "Publish job"}
          </button>
          <Link className="btn btn-secondary" to="/employer/jobs">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

export function EmployerJobsPage() {
  const query = useQuery({
    queryKey: ["employer-dashboard"],
    queryFn: () => data.dashboard().then((response) => response.data),
  });
  const queryClient = useQueryClient();
  const listings = query.data?.jobs ?? [];
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["employer-dashboard"] });
  const changeStatus = async (job: Job) => {
    try {
      if (job.status === "Open") await jobs.close(job.id);
      else await jobs.reopen(job.id);
      await refresh();
      toast.success(job.status === "Open" ? "Job closed." : "Job reopened.");
    } catch (error) {
      notifyError(error);
    }
  };
  const removeJob = async (job: Job) => {
    if (
      !window.confirm(
        `Delete “${job.title}”? This also removes its applications.`,
      )
    )
      return;
    try {
      await jobs.remove(job.id);
      await refresh();
      toast.success("Job deleted.");
    } catch (error) {
      notifyError(error);
    }
  };
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">EMPLOYER WORKSPACE</span>
          <h1>Manage jobs</h1>
        </div>
        <Link className="btn btn-primary" to="/employer/post">
          <Plus size={16} /> Post a job
        </Link>
      </div>
      {query.isLoading ? (
        <p className="muted">Loading your listings…</p>
      ) : query.isError ? (
        <p className="field-error">Your job listings could not be loaded.</p>
      ) : listings.length ? (
        <div className="managed-jobs">
          {listings.map((job) => (
            <article className="card managed-job" key={job.id}>
              <div className="managed-job-heading">
                <div>
                  <span
                    className={`status ${job.status === "Open" ? "status-open" : "status-closed"}`}
                  >
                    {job.status}
                  </span>
                  <h2>{job.title}</h2>
                  <p>
                    {job.location} · {job.job_type} · {salaryText(job.salary)}
                  </p>
                </div>
                <span className="muted">
                  {job.applications_count ?? 0} applicants
                </span>
              </div>
              <div className="actions">
                <Link
                  className="btn btn-secondary"
                  to={`/employer/jobs/${job.id}/edit`}
                >
                  Edit
                </Link>
                <Link className="btn btn-secondary" to="/employer/applicants">
                  View applicants
                </Link>
                <button
                  className="btn btn-secondary"
                  onClick={() => changeStatus(job)}
                >
                  {job.status === "Open" ? "Close listing" : "Reopen listing"}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => removeJob(job)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="No job listings yet"
          text="Publish your first opening to begin receiving applications."
        />
      )}
    </>
  );
}

export function EmployerApplicationsPage() {
  const query = useQuery({
    queryKey: ["eapps"],
    queryFn: () =>
      data.employerApplications().then((response) => response.data),
  });
  const queryClient = useQueryClient();
  return (
    <>
      <h1>Applicants</h1>
      {query.isLoading ? (
        <p className="muted">Loading applicants…</p>
      ) : query.isError ? (
        <p className="field-error">Applicants could not be loaded.</p>
      ) : !query.data?.length ? (
        <Empty
          title="No applications yet"
          text="Applications will appear here after candidates apply to your openings."
        />
      ) : (
        <div className="card tablewrap">
          <table>
            <thead>
              <tr>
                <th>Candidate ID</th>
                <th>Job ID</th>
                <th>Resume ID</th>
                <th>Applied</th>
                <th>Application status</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((application: Application) => (
                <tr key={application.id}>
                  <td>{application.candidate}</td>
                  <td>{application.job}</td>
                  <td>{application.resume ?? "Not attached"}</td>
                  <td>
                    {new Date(application.applied_at).toLocaleDateString()}
                  </td>
                  <td>
                    <select
                      className="input"
                      value={application.status}
                      onChange={async (event) => {
                        try {
                          await data.status(
                            application.id,
                            event.target.value as Application["status"],
                          );
                          await queryClient.invalidateQueries({
                            queryKey: ["eapps"],
                          });
                          toast.success("Application status updated.");
                        } catch (error) {
                          notifyError(error);
                        }
                      }}
                    >
                      <option>Applied</option>
                      <option>Under Review</option>
                      <option>Shortlisted</option>
                      <option>Rejected</option>
                      <option>Selected</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
