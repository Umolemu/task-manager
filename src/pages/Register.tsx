// Register page: creates an account, receives JWT, and navigates to Projects
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/config";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // POST registration details; persist token + user on success
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data: {
        id: string;
        name: string;
        email: string;
        token: string;
        error?: string;
      } = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Registration failed");
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({ id: data.id, name: data.name, email: data.email })
      );
      navigate("/projects");
    } catch (err) {
      setError("Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="auth-title">Create account</h1>
      <p className="auth-subtle">Join TaskLite to get started</p>
      <form onSubmit={onSubmit} className="auth-form">
        <div className="field">
          <span className="label">Name</span>
          <div className="input-wrap">
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="8"
                r="4"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M4 20a8 8 0 0 1 16 0"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <input
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              minLength={2}
            />
          </div>
        </div>
        <div className="field">
          <span className="label">Email</span>
          <div className="input-wrap">
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
        </div>
        <div className="field">
          <span className="label">Password</span>
          <div className="input-wrap">
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 10V8a4 4 0 1 1 8 0v2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Create a password"
              minLength={6}
            />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn full" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
