export type Role = "Candidate" | "Employer";

export type User = { username: string; role: Role };

export type Job = {
  id: number;
  title: string;
  company: string;
  description: string;
  location: string;
  salary: number | null;
  job_type: "Full-time" | "Part-time" | "Internship" | "Contract";
  status: "Open" | "Closed";
  created_at?: string;
  applications_count?: number;
  company_description?: string;
  company_website?: string;
};
