// Kanban-like board per project with drag-and-drop, modal editing, and toasts
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Modal from "../components/Modal";
import type { Task } from "../types/types";
import { Priority, TaskStatus } from "../types/enums";
import { useToast } from "../components/ToastProvider";
import API_BASE_URL from "../config/config";

type ColumnKey = TaskStatus.Todo | TaskStatus.InProgress | TaskStatus.Done;

export default function TasksBoard() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("id") || "";
  const navigate = useNavigate();
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [draft, setDraft] = useState<{
    id?: string;
    name: string;
    description: string;
    tagsCsv: string;
    status: TaskStatus;
    priority: Priority;
    due?: string; // yyyy-mm-dd
  }>({
    name: "",
    description: "",
    tagsCsv: "",
    status: TaskStatus.Todo,
    priority: Priority.Medium,
  });

  // Load tasks for this project (filter client-side by projectId)
  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/tasks`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const data = await res.json();
        if (res.status === 401) {
          console.warn(
            "[TasksBoard] 401 on fetch tasks, redirecting to /login"
          );
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        if (!res.ok) throw new Error(data?.error || "Failed to load tasks");
        const all: Task[] = (data.tasks || []).map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          due: t.due ? new Date(t.due) : undefined,
        }));
        const filtered = projectId
          ? all.filter((t) => t.projectId === projectId)
          : all;
        console.log("[TasksBoard] Loaded tasks", {
          total: all.length,
          filtered: filtered.length,
        });
        setTasks(filtered);
      } catch (e) {
        console.error("[TasksBoard] Failed to load tasks", e);
        setError("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [projectId, navigate]);

  const columns = useMemo(
    () => ({
      [TaskStatus.Todo]: tasks.filter((t) => t.status === TaskStatus.Todo),
      [TaskStatus.InProgress]: tasks.filter(
        (t) => t.status === TaskStatus.InProgress
      ),
      [TaskStatus.Done]: tasks.filter((t) => t.status === TaskStatus.Done),
    }),
    [tasks]
  );

  // Begin drag: put the task id in the dataTransfer payload
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  // Drop handler: optimistic status update then PATCH the task
  const onDrop = async (e: React.DragEvent, dest: ColumnKey) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === dest) return;
    const prev = tasks;
    console.log("[TasksBoard] Drag -> drop update", {
      id,
      from: task.status,
      to: dest,
    });
    // optimistic update
    setTasks((ts) =>
      ts.map((t) =>
        t.id === id ? { ...t, status: dest, updatedAt: new Date() } : t
      )
    );
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: dest }),
      });
      if (res.status === 401) {
        console.warn(
          "[TasksBoard] 401 on status update, redirecting to /login"
        );
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to update task");
      console.log("[TasksBoard] Status updated");
      toast.warning("Task updated");
    } catch (err) {
      console.error("[TasksBoard] Failed to update on drop, reverting", err);
      // revert on error
      setTasks(prev);
    }
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  // Open the modal to create a task with a default status
  const openCreate = (status: ColumnKey) => {
    setMode("create");
    setDraft({
      name: "",
      description: "",
      tagsCsv: "",
      status,
      priority: Priority.Medium,
      due: undefined,
    });
    setDraftOpen(true);
  };

  // Open the modal prefilled with an existing task
  const openEdit = (t: Task) => {
    setMode("edit");
    setDraft({
      id: t.id,
      name: t.name,
      description: t.description || "",
      tagsCsv: (t.tags || []).join(", "),
      status: t.status,
      priority: t.priority,
      due: t.due ? new Date(t.due).toISOString().slice(0, 10) : undefined,
    });
    setDraftOpen(true);
  };

  // Persist the modal form: POST to create or PATCH to update
  const submitDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    const description = draft.description.trim();
    const tags = draft.tagsCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const body = {
      name,
      description,
      tags,
      status: draft.status,
      priority: draft.priority,
      due: draft.due ? new Date(draft.due).toISOString() : undefined,
      projectId,
    } as any;

    try {
      const token = localStorage.getItem("token");
      if (mode === "create") {
        console.log("[TasksBoard] Creating task", { name });
        const res = await fetch(`${API_BASE_URL}/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.status === 401) {
          console.warn("[TasksBoard] 401 on create, redirecting to /login");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        if (!res.ok) throw new Error(data?.error || "Failed to create task");
        setTasks((prev) => [
          {
            ...data,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
            due: data.due ? new Date(data.due) : undefined,
          },
          ...prev,
        ]);
        console.log("[TasksBoard] Task created", { id: data.id });
        setDraftOpen(false);
        toast.success("Task created");
      } else if (mode === "edit" && draft.id) {
        console.log("[TasksBoard] Updating task", { id: draft.id });
        const res = await fetch(`${API_BASE_URL}/tasks/${draft.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.status === 401) {
          console.warn("[TasksBoard] 401 on update, redirecting to /login");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        if (!res.ok) throw new Error(data?.error || "Failed to update task");
        setTasks((prev) =>
          prev.map((t) =>
            t.id === data.id
              ? {
                  ...t,
                  ...data,
                  createdAt: new Date(data.createdAt),
                  updatedAt: new Date(data.updatedAt),
                  due: data.due ? new Date(data.due) : undefined,
                }
              : t
          )
        );
        console.log("[TasksBoard] Task updated", { id: data.id });
        setDraftOpen(false);
        toast.warning("Task updated");
      }
    } catch (err) {
      console.error("[TasksBoard] Submit failed", err);
      // no-op; form remains open for retry
    }
  };

  // Delete current task from modal (asks for confirmation)
  const deleteTask = async () => {
    if (mode !== "edit" || !draft.id) return;
    const ok = confirm("Delete this task?");
    if (!ok) return;
    try {
      const token = localStorage.getItem("token");
      console.log("[TasksBoard] Deleting task", { id: draft.id });
      const res = await fetch(`${API_BASE_URL}/tasks/${draft.id}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.status === 401) {
        console.warn("[TasksBoard] 401 on delete, redirecting to /login");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to delete task");
      setTasks((prev) => prev.filter((t) => t.id !== draft.id));
      console.log("[TasksBoard] Task deleted", { id: draft.id });
      setDraftOpen(false);
      toast.error("Task deleted");
    } catch (e) {
      console.error("[TasksBoard] Delete failed", e);
      // keep modal open
    }
  };

  if (loading)
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    );
  if (error)
    return (
      <div className="page">
        <p className="error">{error}</p>
      </div>
    );

  return (
    <div className="page">
      <h1 className="page-title">Tasks Board</h1>
      <p className="page-subtle">
        Drag tasks between columns to update their status.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        {(
          [
            [TaskStatus.Todo, "Todo"],
            [TaskStatus.InProgress, "In Progress"],
            [TaskStatus.Done, "Done"],
          ] as [ColumnKey, string][]
        ).map(([key, label]) => (
          <section
            key={key}
            onDrop={(e) => onDrop(e, key)}
            onDragOver={onDragOver}
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 12,
              minHeight: 280,
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <strong>{label}</strong>
              <button className="btn-outline" onClick={() => openCreate(key)}>
                + Task
              </button>
            </header>
            <div style={{ display: "grid", gap: 8 }}>
              {columns[key].map((t) => (
                <article
                  key={t.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, t.id)}
                  onClick={() => openEdit(t)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 10,
                    background: "var(--card-bg)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: 14 }}>{t.name}</h4>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {t.priority}
                    </span>
                  </div>
                  {t.description && (
                    <p className="card-desc" style={{ marginTop: 6 }}>
                      {t.description}
                    </p>
                  )}
                  {t.tags?.length ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      {t.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid var(--border)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
              {columns[key].length === 0 && (
                <p className="page-subtle" style={{ margin: 0 }}>
                  No tasks
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
      <Modal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        title={mode === "create" ? "New Task" : "Task Details"}
        footer={
          <>
            {mode === "edit" && (
              <button
                type="button"
                className="btn-outline danger"
                onClick={deleteTask}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              className="btn-outline"
              onClick={() => setDraftOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn" form="task-form">
              Save
            </button>
          </>
        }
      >
        <form
          id="task-form"
          onSubmit={submitDraft}
          className="auth-form"
          style={{ gap: 10 }}
        >
          <div className="field">
            <span className="label">Name</span>
            <div className="input-wrap">
              <input
                className="input no-icon"
                type="text"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="Task name"
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
              placeholder="Describe the task (optional)"
            />
          </div>
          <div className="field">
            <span className="label">Tags</span>
            <div className="input-wrap">
              <input
                className="input no-icon"
                type="text"
                value={draft.tagsCsv}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, tagsCsv: e.target.value }))
                }
                placeholder="Comma-separated tags"
              />
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <div className="field">
              <span className="label">Status</span>
              <select
                className="select"
                value={draft.status}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    status: e.target.value as TaskStatus,
                  }))
                }
              >
                <option value={TaskStatus.Todo}>Todo</option>
                <option value={TaskStatus.InProgress}>In Progress</option>
                <option value={TaskStatus.Done}>Done</option>
              </select>
            </div>
            <div className="field">
              <span className="label">Priority</span>
              <select
                className="select"
                value={draft.priority}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    priority: e.target.value as Priority,
                  }))
                }
              >
                <option value={Priority.Low}>Low</option>
                <option value={Priority.Medium}>Medium</option>
                <option value={Priority.High}>High</option>
              </select>
            </div>
            <div className="field">
              <span className="label">Due</span>
              <div className="input-wrap">
                <input
                  className="input no-icon"
                  type="date"
                  value={draft.due || ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      due: e.target.value || undefined,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
