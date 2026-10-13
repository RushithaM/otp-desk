import { useState, type FormEvent } from "react";
import type { Account } from "../api";

export default function RenameModal({
  account,
  onClose,
  onSubmit,
}: {
  account: Account;
  onClose: () => void;
  onSubmit: (label: string, issuer: string) => Promise<void>;
}) {
  const [label, setLabel] = useState(account.label);
  const [issuer, setIssuer] = useState(account.issuer);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      setError("Account name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(label.trim(), issuer.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Rename account</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Account name</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} required autoFocus />
          </label>
          <label className="field">
            <span>Issuer</span>
            <input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
