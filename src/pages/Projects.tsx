// Projects dashboard: fetch user's projects, filter/sort, create and delete with toasts
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import type { Project } from "../types/types";
import { useToast } from "../components/ToastProvider";
import API_BASE_URL from "../config/config";

type SortKey = "name" | "updatedAt" | "createdAt";
type SortDir = "asc" | "desc";

// Start empty; load from API on mount
const initialProjects: Project[] = [];

// Format a date for display; fall back to string if formatter fails
function formatDate(date: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      date
    );
  } catch {
    return String(date);
  }
}

export default function Projects() {
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [items, setItems] = useState<Project[]>(initialProjects);
  const [openNew, setOpenNew] = useState(false);
  const [draft, setDraft] = useState<{ name: string; description: string }>({
    name: "",
    description: "",
  });

  // Load projects for the logged-in user on page load
  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/projects`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (res.status === 401) {
          // Token invalid/expired: clear and redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        if (!res.ok) throw new Error(data?.error || "Failed to load projects");
        // Normalize date strings into Date objects
        const projects: Project[] = (data.projects || []).map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }));
        setItems(projects);
      } catch (e) {
        // Leave list empty on error to keep UI stable
      }
    };
    run();
  }, []);

  // Derive filtered & sorted array whenever inputs change
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description?.toLowerCase().includes(q) ?? false)
        )
      : items;
    const sorted = [...base].sort((a, b) => {
      let res = 0;
      if (sortKey === "name") {
        res = a.name.localeCompare(b.name);
      } else if (sortKey === "updatedAt") {
        res = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else {
        res = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === "asc" ? res : -res;
    });
    return sorted;
  }, [query, sortKey, sortDir, items]);
  const addProject = () => setOpenNew(true);
  // Create a new project via API; on success, prepend and toast
  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim() || "Untitled Project";
    const description = draft.description.trim();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (res.status === 401) {
        // Token invalid/expired: clear and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to create project");
      setItems((prev) => [
        {
          id: data.id,
          userId: data.userId,
          name: data.name,
          description: data.description,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        },
        ...prev,
      ]);
      setDraft({ name: "", description: "" });
      setOpenNew(false);
      toast.success("Project created");
    } catch (err) {
      // Fallback: optimistic local add if backend unreachable
      const now = new Date();
      const id = "p" + Math.random().toString(36).slice(2, 8);
      setItems((prev) => [
        { id, userId: "u1", name, description, createdAt: now, updatedAt: now },
        ...prev,
      ]);
      setDraft({ name: "", description: "" });
      setOpenNew(false);
      toast.success("Project created (offline)");
    }
  };
  // Delete a project via API, then remove locally and toast
  const deleteProject = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.status === 401) {
        // Token invalid/expired: clear and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error((data as any)?.error || "Failed to delete project");
      }
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast.error("Project deleted");
    } catch (err) {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Projects</h1>
      <p className="page-subtle">
        Your project board. Search and sort as needed.
      </p>

      <div className="toolbar">
        <div className="toolbar-left">
          <input
            className="control"
            type="search"
            placeholder="Search projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn" type="button" onClick={addProject}>
            + New Project
          </button>
        </div>
        <div className="toolbar-right">
          <select
            className="select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Sort by"
          >
            <option value="updatedAt">Updated</option>
            <option value="createdAt">Created</option>
            <option value="name">Name</option>
          </select>
          <select
            className="select"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as SortDir)}
            aria-label="Direction"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <p>No projects found. Try a different search.</p>
        </div>
      ) : (
        <div className="grid" role="list">
          {filtered.map((p) => (
            <article className="card" key={p.id} role="listitem">
              <header className="card-head no-avatar">
                <div className="title-wrap">
                  <h3 className="card-title">{p.name}</h3>
                </div>
                <div className="card-actions">
                  <button
                    className="icon-btn"
                    type="button"
                    title="Open"
                    aria-label={`Open ${p.name}`}
                    onClick={() => navigate(`/project?id=${p.id}`)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7 17l10-10"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M9 7h8v8"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    </svg>
                  </button>
                  <button
                    className="icon-btn danger"
                    type="button"
                    onClick={() => deleteProject(p.id)}
                    title="Delete"
                    aria-label={`Delete ${p.name}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 7h16"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M9 7v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M10 7V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    </svg>
                  </button>
                </div>
              </header>
              <hr className="divider" />
              {p.description && <p className="card-desc">{p.description}</p>}
              <div className="meta">
                <em>Updated {formatDate(new Date(p.updatedAt))}</em>
              </div>
              <div className="card-footer" />
            </article>
          ))}
        </div>
      )}
      <Modal
        open={openNew}
        onClose={() => setOpenNew(false)}
        title="New Project"
        footer={
          <>
            <button
              className="btn-outline"
              type="button"
              onClick={() => setOpenNew(false)}
            >
              Cancel
            </button>
            <button className="btn" type="submit" form="new-project-form">
              Create
            </button>
          </>
        }
      >
        <form
          id="new-project-form"
          onSubmit={submitNew}
          className="auth-form"
          style={{ gap: 10 }}
        >
          <div className="field">
            <span className="label">Name</span>
            <div className="input-wrap">
              <svg
                className="icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 6h16v12H4z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M4 7l8 6 8-6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <input
                className="input"
                type="text"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="Project name"
                required
                minLength={2}
              />
            </div>
          </div>
          <div className="field">
            <span className="label">Description</span>
            <textarea
              className="input"
              style={{ height: 90, paddingLeft: 12 }}
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => ({ ...d, description: e.target.value }))
              }
              placeholder="What is this project about?"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
