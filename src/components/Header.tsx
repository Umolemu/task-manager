// App header with brand, logout, and theme toggle; hidden on auth pages
import { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';

// Pick initial theme from localStorage or OS preference
function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export default function Header() {
  const loc = useLocation();
  const hide = loc.pathname.startsWith('/login') || loc.pathname.startsWith('/register');
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme());
  const navigate = useNavigate();

  useEffect(() => {
  // Reflect selected theme as a data attribute for CSS variables
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  if (hide) return null;

  return (
    <header className="app-header">
      <div className="nav">
        <Link to="/projects" className="brand">TaskLite</Link>
        <div className="spacer" />
    {typeof window !== 'undefined' && localStorage.getItem('token') && (
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
      // Clear auth and return to login
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }}
            aria-label="Logout"
            title="Logout"
          >
            Logout
          </button>
        )}
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === 'light' ? 'Dark' : 'Light'} mode
        </button>
      </div>
    </header>
  );
}
