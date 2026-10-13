import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Briefcase, Check, Search } from "lucide-react";
import toast from "react-hot-toast";
import { jobs } from "../../api";
import { Empty, JobCard, Stat } from "../../components/common/PortalUI";
import { SiteShell } from "../../layouts/SiteLayout";
import { useStoredUser } from "../../hooks/useStoredUser";
import { notifyError } from "../../utils/errors";

const money = (amount: number | null) =>
  amount ? `₹${amount.toLocaleString()}` : "Salary not disclosed";

export function Home() {
  const query = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobs.list({ page: 1 }).then((response) => response.data),
    retry: 1,
  });
  const openings = query.data?.results || [];
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  return (
    <SiteShell>
      <section className="hero">
        <div className="container hero-layout">
          <div className="hero-copy">
            <span className="hero-kicker">
              <i /> YOUR NEXT CHAPTER STARTS HERE
            </span>
            <h1>
              Work that <em>moves you forward.</em>
            </h1>
            <p>
              Discover openings from teams that value what you bring. Search
              roles that fit the way you want to work.
            </p>
            <form
              className="search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate(`/jobs?search=${encodeURIComponent(search)}`);
              }}
            >
              <Search aria-hidden="true" />
              <input
                aria-label="Job title, keywords or company"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Job title, skills or company"
              />
              <button className="btn btn-primary">Find a job</button>
            </form>
            <div className="hero-proof">
              <span>Explore</span>
              <b>Full-time</b>
              <i />
              <b>Part-time</b>
              <i />
              <b>Internships</b>
            </div>
          </div>
          <figure className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85"
              alt="Colleagues sharing ideas around a table"
            />
          </figure>
        </div>
      </section>
      <main className="container section">
        <div className="section-title">
          <h2>Latest opportunities</h2>
          <Link to="/jobs">View all</Link>
        </div>
        {query.isLoading ? (
          <p className="muted">Loading current openings…</p>
        ) : query.isError ? (
          <Empty
            title="Openings are unavailable"
            text="The job service could not be reached. Please try again shortly."
          />
        ) : openings.length ? (
          <div className="job-list-grid">
            {openings.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <Empty
            title="No open roles yet"
            text="New openings will appear here when employers publish them."
          />
        )}
        <div className="stats">
          <Stat
            n={
              query.isLoading
                ? "…"
                : query.isError
                  ? "—"
                  : String(query.data?.count ?? 0)
            }
            t="Open roles across the platform"
          />
        </div>
        <div className="section-title">
          <h2>Explore by job type</h2>
        </div>
        <div className="category-links">
          {["Full-time", "Part-time", "Internship", "Contract"].map((type) => (
            <Link key={type} to={`/jobs?job_type=${encodeURIComponent(type)}`}>
              {type}
              <span>↗</span>
            </Link>
          ))}
        </div>
      </main>
    </SiteShell>
  );
}

export function Jobs() {
  const params = new URLSearchParams(useLocation().search);
  const [search, setSearch] = useState(params.get("search") || "");
  const [location, setLocation] = useState(params.get("location") || "");
  const [jobType, setJobType] = useState(params.get("job_type") || "");
  const [minimumSalary, setMinimumSalary] = useState(
    params.get("min_salary") || "",
  );
  const [page, setPage] = useState(Number(params.get("page") || 1));
  const query = useQuery({
    queryKey: ["jobs", search, location, jobType, minimumSalary, page],
    queryFn: () =>
      jobs
        .list({
          search: search || undefined,
          location: location || undefined,
          job_type: jobType || undefined,
          min_salary: minimumSalary || undefined,
          page,
        })
        .then((response) => response.data),
    retry: 1,
  });
  const openings = query.data?.results || [];
  const clearFilters = () => {
    setSearch("");
    setLocation("");
    setJobType("");
    setMinimumSalary("");
    setPage(1);
  };
  return (
    <SiteShell>
      <main className="container section jobs-page">
        <div className="jobs-heading">
          <div>
            <span className="eyebrow">THE OPEN ROLE INDEX</span>
            <h1>Find your next opportunity</h1>
            <p>Good work starts with a better search.</p>
          </div>
          <span className="jobs-count">
            {query.isLoading
              ? "…"
              : query.isError
                ? "Unavailable"
                : (query.data?.count ?? 0)}
            <small>{query.isError ? "job service" : "open roles"}</small>
          </span>
        </div>
        <div className="jobs-layout">
          <aside className="card filters-panel">
            <div className="filter-heading">
              <div>
                <span className="eyebrow">NARROW IT DOWN</span>
                <h2>Filters</h2>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={clearFilters}
              >
                Reset
              </button>
            </div>
            <label className="label">
              Keywords
              <input
                className="input"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Role, skills, company"
                aria-label="Search jobs"
              />
            </label>
            <label className="label">
              Location
              <input
                className="input"
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                  setPage(1);
                }}
                placeholder="City or region"
                aria-label="Filter by location"
              />
            </label>
            <label className="label">
              Job type
              <select
                className="input"
                value={jobType}
                onChange={(event) => {
                  setJobType(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by job type"
              >
                <option value="">Any type</option>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Internship</option>
                <option>Contract</option>
              </select>
            </label>
            <label className="label">
              Minimum salary
              <input
                className="input"
                type="number"
                min="0"
                value={minimumSalary}
                onChange={(event) => {
                  setMinimumSalary(event.target.value);
                  setPage(1);
                }}
                placeholder="No minimum"
                aria-label="Minimum salary"
              />
            </label>
            <div className="filter-note">
              <Check size={15} aria-hidden="true" />
              <p>Only currently open roles are shown.</p>
            </div>
          </aside>
          <section className="jobs-results" aria-label="Job search results">
            <div className="results-heading">
              <div>
                <h2>
                  {query.isLoading
                    ? "Finding roles"
                    : query.isError
                      ? "Results unavailable"
                      : `${query.data?.count ?? 0} open roles`}
                </h2>
                <p>
                  {search || location || jobType || minimumSalary
                    ? "Matched to your filters"
                    : "Recently posted opportunities"}
                </p>
              </div>
              <span className="sort-label">Newest first</span>
            </div>
            {query.isLoading ? (
              <div className="job-list-grid jobs-grid">
                {[0, 1, 2, 3].map((key) => (
                  <div className="card skeleton-job" key={key}>
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                ))}
              </div>
            ) : query.isError ? (
              <div className="card service-state">
                <span className="service-mark">
                  <Briefcase size={20} />
                </span>
                <span className="eyebrow">CONNECTION ISSUE</span>
                <h2>We can’t reach the job board</h2>
                <p>
                  Check that the Django API is running, then try again. Your
                  filters are still here.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => query.refetch()}
                >
                  Try again
                </button>
              </div>
            ) : !openings.length ? (
              <Empty
                title="No roles match those filters"
                text="Reset a filter or try a broader search to see more openings."
              />
            ) : (
              <div className="job-list-grid jobs-grid">
                {openings.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
            <div className="pagination">
              <button
                className="btn btn-secondary"
                disabled={!query.data?.previous || query.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                ← Previous
              </button>
              <span>
                Page <b>{page}</b>
              </span>
              <button
                className="btn btn-secondary"
                disabled={!query.data?.next || query.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next →
              </button>
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}

export function JobDetails() {
  const { id } = useParams();
  const user = useStoredUser();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["job", id],
    queryFn: () => jobs.get(id!).then((response) => response.data),
  });
  if (query.isLoading)
    return (
      <SiteShell>
        <main className="container section">Loading…</main>
      </SiteShell>
    );
  if (query.isError || !query.data)
    return (
      <SiteShell>
        <main className="container section">Job unavailable.</main>
      </SiteShell>
    );
  const job = query.data;
  return (
    <SiteShell>
      <main className="container section">
        <article className="card detail">
          <span className="pill">{job.job_type}</span>
          <h1>{job.title}</h1>
          <p>
            {job.company} · {job.location}
          </p>
          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!user) return navigate("/login");
                if (user.role !== "Candidate")
                  return toast.error("Only candidates can apply.");
                navigate(`/candidate/applications?apply=${job.id}`);
              }}
            >
              Apply now
            </button>
            <SaveJobButton id={job.id} />
          </div>
          <hr />
          <h2>About this role</h2>
          <p className="description">{job.description}</p>
          <strong>{money(job.salary)}</strong>
          {job.company_description && (
            <>
              <hr />
              <h2>About {job.company}</h2>
              <p className="description">{job.company_description}</p>
            </>
          )}
          {job.company_website && (
            <p>
              <a href={job.company_website} target="_blank" rel="noreferrer">
                Visit company website
              </a>
            </p>
          )}
        </article>
      </main>
    </SiteShell>
  );
}

function SaveJobButton({ id }: { id: number }) {
  const user = useStoredUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => jobs.save(id),
    onSuccess: () => {
      toast.success("Job saved");
      queryClient.invalidateQueries({ queryKey: ["saved"] });
    },
    onError: notifyError,
  });
  return (
    <button
      className="btn btn-secondary"
      disabled={mutation.isPending}
      onClick={() =>
        !user
          ? navigate("/login")
          : user.role !== "Candidate"
            ? toast.error("Only candidates can save jobs.")
            : mutation.mutate()
      }
    >
      <Bookmark size={16} /> Save
    </button>
  );
}
