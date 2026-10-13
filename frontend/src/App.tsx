import { useEffect, useState } from "react";
import { api, type User } from "./api";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .session()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="page-center">Loading…</div>;
  }

  if (!user) {
    return <LoginPage onAuthenticated={setUser} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
