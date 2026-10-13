import { useEffect, useState } from "react";
import { api, type Account, type User } from "../api";
import AccountCard from "./AccountCard";
import AddAccountModal, { type NewAccountInput } from "./AddAccountModal";
import RenameModal from "./RenameModal";

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [renaming, setRenaming] = useState<Account | null>(null);

  useEffect(() => {
    api
      .listAccounts()
      .then(({ accounts }) => setAccounts(accounts))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(input: NewAccountInput) {
    const { account } = await api.addAccount(input);
    setAccounts((prev) => [...prev, account]);
    setShowAdd(false);
  }

  async function handleRename(label: string, issuer: string) {
    if (!renaming) return;
    const { account } = await api.renameAccount(renaming.id, { label, issuer });
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
    setRenaming(null);
  }

  async function handleDelete(account: Account) {
    if (!window.confirm(`Delete "${account.label}"? This cannot be undone.`)) return;
    await api.deleteAccount(account.id);
    setAccounts((prev) => prev.filter((a) => a.id !== account.id));
  }

  async function handleLogout() {
    await api.logout();
    onLogout();
  }

  return (
    <div className="page">
      <header className="header">
        <span className="brand">OTP Desk</span>
        <div className="header-actions">
          <span className="subtle">{user.email}</span>
          <button type="button" className="btn-link" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="main">
        <div className="main-toolbar">
          <h1>Accounts</h1>
          <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
            Add account
          </button>
        </div>

        {loading && <p className="subtle">Loading accounts…</p>}

        {!loading && accounts.length === 0 && (
          <div className="card empty-state">
            <p>No accounts yet.</p>
            <p className="subtle">Add one by scanning a QR code or entering a secret key.</p>
          </div>
        )}

        <div className="account-grid">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onRename={setRenaming}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </main>

      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} onSubmit={handleAdd} />}
      {renaming && (
        <RenameModal account={renaming} onClose={() => setRenaming(null)} onSubmit={handleRename} />
      )}
    </div>
  );
}
