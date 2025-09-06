// Login page: authenticates via backend and stores JWT + user in localStorage
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/config";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // POST credentials to backend; on success, persist token + user and go to Projects
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data: {
        id: string;
        name: string;
        email: string;
        token: string;
        error?: string;
      } = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Login failed");
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({ id: data.id, name: data.name, email: data.email })
      );
      navigate("/projects");
    } catch (err) {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="auth-title">Welcome!</h1>
      <p className="auth-subtle">Please sign in to continue</p>
      <form onSubmit={onSubmit} className="auth-form">
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
              placeholder="Your password"
              minLength={6}
            />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn full" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>
      <p className="auth-footer">
        No account? <Link to="/register">Create one</Link>
      </p>
    </div>
  );
}
