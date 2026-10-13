import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  data,
  jobs,
  type Application,
  type Resume,
  type SavedJob,
} from "../../api";
import { ApplicationTable, Empty } from "../../components/common/PortalUI";
import { notifyError, responseFieldErrors } from "../../utils/errors";

export function ResumeManagerPage() {
  const query = useQuery({
    queryKey: ["resumes"],
    queryFn: () => data.resumes().then((response) => response.data),
  });
  const queryClient = useQueryClient();
  const [uploadError, setUploadError] = useState("");
  return (
    <>
      <h1>Resume management</h1>
      <div className="card upload">
        <label className="label">
          Upload a resume (PDF, DOC, or DOCX, max 5 MB)
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={async (event) => {
              setUploadError("");
              const file = event.target.files?.[0];
              if (file && file.size > 5 * 1024 * 1024) {
                toast.error("Resume files must be smaller than 5 MB.");
                event.target.value = "";
                return;
              }
              if (!file) return;
              try {
                await data.upload(file);
                await queryClient.invalidateQueries({ queryKey: ["resumes"] });
                toast.success("Uploaded");
              } catch (error) {
                setUploadError(
                  responseFieldErrors(error).file ||
                    "Upload failed. Check file type and size.",
                );
                notifyError(error);
              }
            }}
          />
          {uploadError && <small className="field-error">{uploadError}</small>}
        </label>
      </div>
      {query.isLoading ? (
        <p className="muted">Loading resumes…</p>
      ) : query.isError ? (
        <p className="field-error">Resumes could not be loaded.</p>
      ) : (
        query.data?.map((resume: Resume) => (
          <div className="card row" key={resume.id}>
            <div>
              <strong>Resume #{resume.id}</strong>
              <small className="muted">
                Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}
              </small>
            </div>
            <button
              className="btn btn-danger"
              aria-label={`Delete resume ${resume.id}`}
              onClick={async () => {
                if (
                  !window.confirm(
                    "Delete this resume? Applications that use it will retain their application record without the file.",
                  )
                )
                  return;
                try {
                  await data.deleteResume(resume.id);
                  await queryClient.invalidateQueries({
                    queryKey: ["resumes"],
                  });
                  toast.success("Resume deleted.");
                } catch (error) {
                  notifyError(error);
                }
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))
      )}
      {!query.isLoading && !query.isError && !query.data?.length && (
        <Empty
          title="No resumes uploaded"
          text="Upload a resume before applying, or submit an application without one."
        />
      )}
    </>
  );
}

export function ApplicationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const applications = useQuery({
    queryKey: ["apps"],
    queryFn: () => data.applications().then((response) => response.data),
  });
  const resumes = useQuery({
    queryKey: ["resumes"],
    queryFn: () => data.resumes().then((response) => response.data),
  });
  const id = new URLSearchParams(useLocation().search).get("apply");
  const [resumeId, setResumeId] = useState("");
  const job = useQuery({
    queryKey: ["job", id],
    queryFn: () => jobs.get(id!).then((response) => response.data),
    enabled: Boolean(id),
  });
  const alreadyApplied = applications.data?.some(
    (application) => application.job === Number(id),
  );
  const submitApplication = async () => {
    if (!id || alreadyApplied) return;
    try {
      await jobs.apply(Number(id), {
        job: Number(id),
        resume: resumeId ? Number(resumeId) : null,
      });
      await queryClient.invalidateQueries({ queryKey: ["apps"] });
      toast.success("Your application was submitted.");
      navigate("/candidate/applications", { replace: true });
    } catch (error) {
      notifyError(error);
    }
  };
  return (
    <>
      <h1>My applications</h1>
      {id && (
        <div className="card apply">
          {job.isLoading ? (
            <p>Checking this opening…</p>
          ) : job.isError ? (
            <p className="field-error">
              This opening is no longer available for applications.
            </p>
          ) : alreadyApplied ? (
            <p>
              You have already applied to <strong>{job.data?.title}</strong>.
            </p>
          ) : (
            <>
              <div>
                <span className="eyebrow">APPLICATION</span>
                <h2>{job.data?.title}</h2>
                <p className="muted">
                  {job.data?.company} · {job.data?.location}
                </p>
              </div>
              <label className="label">
                Resume <span className="muted">(optional)</span>
                <select
                  className="input"
                  value={resumeId}
                  onChange={(event) => setResumeId(event.target.value)}
                >
                  <option value="">Apply without a resume</option>
                  {(resumes.data || []).map((resume: Resume) => (
                    <option key={resume.id} value={resume.id}>
                      Resume #{resume.id}
                    </option>
                  ))}
                </select>
              </label>
              {!resumes.data?.length && !resumes.isLoading && (
                <p className="muted">
                  You can add a resume from the{" "}
                  <Link to="/candidate/resumes">resume manager</Link>.
                </p>
              )}
              <button
                className="btn btn-primary"
                onClick={submitApplication}
                disabled={applications.isLoading || !applications.data}
              >
                Submit application
              </button>
            </>
          )}
        </div>
      )}
      {applications.isLoading ? (
        <p className="muted">Loading applications…</p>
      ) : applications.isError ? (
        <p className="field-error">Applications could not be loaded.</p>
      ) : applications.data?.length ? (
        <ApplicationTable apps={applications.data as Application[]} />
      ) : (
        <Empty
          title="No applications yet"
          text="Apply to a role to see it here."
        />
      )}
    </>
  );
}

export function SavedJobsPage() {
  const query = useQuery({
    queryKey: ["saved"],
    queryFn: () => jobs.saved().then((response) => response.data),
  });
  const queryClient = useQueryClient();
  return (
    <>
      <h1>Saved jobs</h1>
      {query.isLoading ? (
        <p className="muted">Loading saved jobs…</p>
      ) : query.isError ? (
        <p className="field-error">Saved jobs could not be loaded.</p>
      ) : query.data?.length ? (
        <div className="saved-list">
          {query.data.map((saved: SavedJob) => (
            <article className="card saved-job" key={saved.saved_id}>
              <div>
                <span className="pill">{saved.job_type}</span>
                <h2>
                  <Link to={`/jobs/${saved.job_id}`}>{saved.title}</Link>
                </h2>
                <p>
                  {saved.company} · {saved.location}
                </p>
                <strong>
                  {saved.salary
                    ? `₹${saved.salary.toLocaleString()}`
                    : "Salary not disclosed"}
                </strong>
                <small className="muted">
                  Saved {new Date(saved.saved_at).toLocaleDateString()}
                </small>
              </div>
              <div className="actions">
                <Link className="btn btn-primary" to={`/jobs/${saved.job_id}`}>
                  View role
                </Link>
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    try {
                      await jobs.unsave(saved.saved_id);
                      await queryClient.invalidateQueries({
                        queryKey: ["saved"],
                      });
                      toast.success("Removed from saved jobs.");
                    } catch (error) {
                      notifyError(error);
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="No saved jobs yet"
          text="Bookmark an opening to keep it close while you decide."
        />
      )}
    </>
  );
}
