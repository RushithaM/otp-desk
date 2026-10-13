import { useEffect, useRef, useState, type FormEvent } from "react";
import { decodeQrFromFile, decodeQrFromVideoFrame } from "../lib/qr";
import { parseOtpAuthUri } from "../lib/totp";

export interface NewAccountInput {
  label: string;
  issuer: string;
  secret: string;
  algorithm?: string;
  digits?: number;
  period?: number;
}

export default function AddAccountModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: NewAccountInput) => Promise<void>;
}) {
  const [tab, setTab] = useState<"scan" | "manual">("scan");
  const [label, setLabel] = useState("");
  const [issuer, setIssuer] = useState("");
  const [secret, setSecret] = useState("");
  const [extra, setExtra] = useState<{ algorithm: string; digits: number; period: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  function applyParsed(uri: string): boolean {
    const parsed = parseOtpAuthUri(uri);
    if (!parsed) return false;
    setLabel(parsed.label);
    setIssuer(parsed.issuer);
    setSecret(parsed.secret);
    setExtra({ algorithm: parsed.algorithm, digits: parsed.digits, period: parsed.period });
    setTab("manual");
    setError(null);
    return true;
  }

  async function handleFileUpload(file: File) {
    setError(null);
    const text = await decodeQrFromFile(file).catch(() => null);
    if (!text || !applyParsed(text)) {
      setError("Could not read a valid TOTP QR code from that image");
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      const loop = () => {
        if (videoRef.current && canvasRef.current) {
          const text = decodeQrFromVideoFrame(videoRef.current, canvasRef.current);
          if (text && applyParsed(text)) {
            stopCamera();
            return;
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setError("Could not access the camera. You can upload a QR image instead.");
    }
  }

  useEffect(() => () => stopCamera(), []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!label.trim() || !secret.trim()) {
      setError("Account name and secret key are required");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ label: label.trim(), issuer: issuer.trim(), secret: secret.trim(), ...extra });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add account</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="tabs">
          <button type="button" className={tab === "scan" ? "tab active" : "tab"} onClick={() => setTab("scan")}>
            Scan QR
          </button>
          <button type="button" className={tab === "manual" ? "tab active" : "tab"} onClick={() => setTab("manual")}>
            Manual entry
          </button>
        </div>

        {tab === "scan" && (
          <div className="scan-panel">
            {cameraActive ? (
              <div className="camera-wrap">
                <video ref={videoRef} muted playsInline className="camera-video" />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <button type="button" className="btn-secondary" onClick={stopCamera}>
                  Stop camera
                </button>
              </div>
            ) : (
              <button type="button" className="btn-secondary" onClick={startCamera}>
                Use camera
              </button>
            )}

            <div className="divider">or</div>

            <label className="file-upload">
              Upload QR image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </label>
          </div>
        )}

        {tab === "manual" && (
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Account name</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} required autoFocus />
            </label>
            <label className="field">
              <span>Issuer (optional)</span>
              <input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
            </label>
            <label className="field">
              <span>Secret key</span>
              <input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                required
                placeholder="Base32 secret key"
              />
            </label>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Adding…" : "Add account"}
            </button>
          </form>
        )}

        {tab === "scan" && error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
