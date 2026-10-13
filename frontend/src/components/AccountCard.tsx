import { useEffect, useState } from "react";
import type { Account } from "../api";
import { generateCode, secondsRemaining } from "../lib/totp";

export default function AccountCard({
  account,
  onRename,
  onDelete,
}: {
  account: Account;
  onRename: (account: Account) => void;
  onDelete: (account: Account) => void;
}) {
  const [code, setCode] = useState(() => generateCode(account));
  const [remaining, setRemaining] = useState(() => secondsRemaining(account.period));
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const tick = () => {
      setRemaining(secondsRemaining(account.period));
      setCode(generateCode(account));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [account]);

  const formattedCode = `${code.slice(0, code.length / 2)} ${code.slice(code.length / 2)}`;
  const progress = remaining / account.period;

  return (
    <div className="card account-card">
      <div className="account-info">
        <div className="account-text">
          <div className="account-label">{account.label}</div>
          {account.issuer && <div className="account-issuer">{account.issuer}</div>}
        </div>
        <div className="account-menu">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Account options"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="menu" onMouseLeave={() => setMenuOpen(false)}>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onRename(account);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="menu-danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(account);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="account-code-row">
        <span className="account-code">{formattedCode}</span>
        <svg className="countdown" width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12" className="countdown-track" />
          <circle
            cx="14"
            cy="14"
            r="12"
            className="countdown-progress"
            strokeDasharray={2 * Math.PI * 12}
            strokeDashoffset={2 * Math.PI * 12 * (1 - progress)}
          />
        </svg>
      </div>
    </div>
  );
}
