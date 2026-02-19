import { useState, useEffect, useRef } from "react"
import axios from "axios"

const BACKEND_URL = "http://localhost:3000"

const STATUSES = ["uploaded", "cloning", "building", "deploying", "deployed"]

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Queued",
  cloning: "Cloning Repo",
  building: "Building",
  deploying: "Deploying",
  deployed: "Live",
}

const STATUS_ICONS: Record<string, React.JSX.Element> = {
  uploaded: (
    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  cloning: (
    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  building: (
    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  deploying: (
    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  deployed: (
    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
}

const LOADING_PHRASES: Record<string, string[]> = {
  uploaded: ["Queued for deployment...", "Waiting to start..."],
  cloning: ["Cloning your repository...", "Fetching source code...", "Pulling from GitHub..."],
  building: ["Installing dependencies...", "Compiling source files...", "Bundling assets...", "Running build scripts..."],
  deploying: ["Spinning up containers...", "Configuring routes...", "Almost there...", "Finalizing deployment..."],
  deployed: ["Your site is live!"],
}

function useLoadingPhrase(status: string) {
  const [phraseIdx, setPhraseIdx] = useState(0)

  useEffect(() => {
    setPhraseIdx(0)
    const phrases = LOADING_PHRASES[status] || []
    if (phrases.length <= 1) return
    const t = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % phrases.length)
    }, 2200)
    return () => clearInterval(t)
  }, [status])

  const phrases = LOADING_PHRASES[status] || ["Processing..."]
  return phrases[phraseIdx] ?? phrases[0]
}

function ActiveIconSpinner() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0f0f0f"
      strokeWidth="2.5"
      style={{ animation: "spinAnim 0.9s linear infinite" }}
    >
      <path strokeLinecap="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function StatusTimeline({ status }: { status: string }) {
  const currentIdx = STATUSES.indexOf(status)

  return (
    <div style={{ marginTop: "20px" }}>
      {STATUSES.map((s, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        const pending = i > currentIdx

        return (
          <div key={s} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.4s ease",
                  background: done ? "#22c55e" : active ? "#e8e8e8" : "#1a1a1a",
                  border: pending ? "1px solid #252525" : "none",
                  boxShadow: active ? "0 0 18px rgba(232,232,232,0.18)" : done ? "0 0 10px rgba(34,197,94,0.25)" : "none",
                  color: done ? "#fff" : active ? "#0f0f0f" : "#2e2e2e",
                }}
              >
                {active ? <ActiveIconSpinner /> : STATUS_ICONS[s]}
              </div>
              {i < STATUSES.length - 1 && (
                <div
                  style={{
                    width: "1px",
                    height: "26px",
                    background: done ? "#22c55e" : "#1e1e1e",
                    transition: "background 0.5s ease",
                    margin: "3px 0",
                  }}
                />
              )}
            </div>

            <div style={{ paddingTop: "6px", paddingBottom: i < STATUSES.length - 1 ? "0" : "0" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  color: done ? "#22c55e" : active ? "#e8e8e8" : "#2e2e2e",
                  fontFamily: "'Syne', sans-serif",
                  transition: "color 0.3s",
                  lineHeight: 1,
                  marginBottom: "3px",
                }}
              >
                {STATUS_LABELS[s]}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: done ? "#2d6e42" : active ? "#666" : "#242424",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  transition: "color 0.3s",
                }}
              >
                {done ? "Complete" : active ? "In progress" : "Waiting"}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Spinner() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0f0f0f"
      strokeWidth="2.5"
      style={{ animation: "spinAnim 0.9s linear infinite", flexShrink: 0 }}
    >
      <path strokeLinecap="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

export default function DeployPage() {
  const [repoUrl, setRepoUrl] = useState("")
  const [deploymentId, setDeploymentId] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [deployedUrl, setDeployedUrl] = useState("")
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const loadingPhrase = useLoadingPhrase(status)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleDeploy = async () => {
    try {
      setError("")
      setDeployedUrl("")
      setDeploymentId("")
      setLoading(true)
      setStatus("uploaded")

      const res = await axios.post(`${BACKEND_URL}/deploy`, {
        repoURL: repoUrl,
      })

      const id = res.data.id
      setDeploymentId(id)

      const interval = setInterval(async () => {
        try {
          const response = await axios.get(`${BACKEND_URL}/status/${id}`)
          const currentStatus = response.data.status
          setStatus(currentStatus)

          if (currentStatus === "deployed") {
            clearInterval(interval)
            setLoading(false)
            const url = `http://${id}.localhost:3001`
            setDeployedUrl(url)
            window.open(url, "_blank")
          }
        } catch (err) {
          console.error(err)
          clearInterval(interval)
          setLoading(false)
          setError("Failed to fetch deployment status.")
        }
      }, 5000)
    } catch (err) {
      console.error(err)
      setLoading(false)
      setError("Deployment failed. Check the repo URL and try again.")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && repoUrl) handleDeploy()
  }

  const progressPct = STATUSES.indexOf(status) >= 0
    ? Math.round(((STATUSES.indexOf(status) + 1) / STATUSES.length) * 100)
    : 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0f0f0f;
          min-height: 100vh;
          font-family: 'DM Mono', monospace;
        }

        @keyframes spinAnim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulseAnim {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.8); opacity: 0; }
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #0f0f0f;
          position: relative;
          overflow: hidden;
        }

        .bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .bg-glow {
          position: absolute;
          width: 700px;
          height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .card {
          background: #161616;
          border: 1px solid #222;
          border-radius: 20px;
          padding: 2.5rem;
          width: 100%;
          max-width: 500px;
          position: relative;
          box-shadow: 0 32px 80px rgba(0,0,0,0.7);
          animation: fadeSlideIn 0.4s ease;
        }

        .card-top-line {
          position: absolute;
          top: 0; left: 20px; right: 20px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          border-radius: 999px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #1c1c1c;
          border: 1px solid #2a2a2a;
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 10px;
          color: #666;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 500;
          margin-bottom: 1.4rem;
        }

        .badge-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #fff;
          opacity: 0.5;
        }

        .title {
          font-family: 'Syne', sans-serif;
          font-size: 1.9rem;
          font-weight: 800;
          color: #f0f0f0;
          line-height: 1.1;
          margin-bottom: 0.35rem;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 11.5px;
          color: #484848;
          margin-bottom: 2rem;
          letter-spacing: 0.04em;
        }

        .input-wrap { position: relative; margin-bottom: 1rem; }

        .input-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          color: #424242;
          display: flex; align-items: center;
        }

        .input {
          width: 100%;
          background: #0f0f0f;
          border: 1px solid #222;
          border-radius: 10px;
          padding: 14px 14px 14px 42px;
          color: #e0e0e0;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input::placeholder { color: #333; }

        .input:focus {
          border-color: #333;
          box-shadow: 0 0 0 3px rgba(255,255,255,0.03);
        }

        .btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #ebebeb;
          color: #0f0f0f;
          border: none;
          border-radius: 10px;
          padding: 14px;
          font-family: 'Syne', sans-serif;
          font-size: 13.5px;
          font-weight: 700;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 2px 20px rgba(255,255,255,0.07);
        }

        .btn:hover:not(:disabled) {
          background: #fff;
          box-shadow: 0 4px 28px rgba(255,255,255,0.16);
          transform: translateY(-1px);
        }

        .btn:active:not(:disabled) { transform: translateY(0); }
        .btn:disabled { opacity: 0.28; cursor: not-allowed; }

        /* ── Loading status block ── */
        .loading-block {
          margin-top: 1.2rem;
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 10px;
          padding: 14px 16px;
          animation: fadeSlideIn 0.3s ease;
        }

        .loading-phrase-row {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 10px;
        }

        .loading-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #aaa;
          animation: blink 1.1s ease-in-out infinite;
          flex-shrink: 0;
        }

        .loading-phrase {
          font-size: 12px;
          color: #aaa;
          letter-spacing: 0.03em;
        }

        .loading-id-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .loading-id-label {
          font-size: 10px;
          color: #3a3a3a;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .loading-id-val {
          font-size: 10.5px;
          color: #4e4e4e;
          letter-spacing: 0.04em;
        }

        .progress-track {
          width: 100%;
          height: 2px;
          background: #1e1e1e;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #333, #d0d0d0);
          border-radius: 999px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ── Error ── */
        .error-box {
          margin-top: 1rem;
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.16);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 11.5px;
          color: #ef4444;
          letter-spacing: 0.02em;
          animation: fadeSlideIn 0.3s ease;
        }

        .divider {
          height: 1px;
          background: #1c1c1c;
          margin: 1.4rem 0;
        }

        /* ── Meta box ── */
        .meta-box {
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 10px;
          padding: 12px 16px;
        }

        .meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10.5px;
          color: #404040;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .meta-row + .meta-row {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #181818;
        }

        .meta-val {
          color: #b8b8b8;
          font-size: 11px;
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        /* ── Deployed link ── */
        .deployed-link {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 1.2rem;
          background: rgba(34,197,94,0.05);
          border: 1px solid rgba(34,197,94,0.18);
          border-radius: 10px;
          padding: 14px 16px;
          text-decoration: none;
          color: #fff;
          font-size: 12px;
          letter-spacing: 0.03em;
          transition: background 0.2s, border-color 0.2s;
          animation: fadeSlideIn 0.4s ease;
        }

        .deployed-link:hover {
          background: rgba(34,197,94,0.09);
          border-color: rgba(34,197,94,0.3);
        }

        .deployed-link-icon {
          width: 30px; height: 30px;
          background: #22c55e;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .pulse {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          position: relative;
          flex-shrink: 0;
        }

        .pulse::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: rgba(34,197,94,0.3);
          animation: pulseAnim 1.6s ease-out infinite;
        }
      `}</style>

      <div className="page">
        <div className="bg-grid" />
        <div className="bg-glow" />

        <div className="card">
          <div className="card-top-line" />

          <div className="badge">
            <span className="badge-dot" />
            Deploy in seconds
          </div>

          <h1 className="title">Mini Vercel<br />Clone</h1>
          <p className="subtitle">// paste a github repo · we handle the rest</p>

          <div className="input-wrap">
            <span className="input-icon">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </span>
            <input
              ref={inputRef}
              className="input"
              type="text"
              placeholder="https://github.com/user/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button
            className="btn"
            onClick={handleDeploy}
            disabled={loading || !repoUrl}
          >
            {loading ? (
              <>
                <Spinner />
                Deploying
              </>
            ) : (
              <>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Deploy Now
              </>
            )}
          </button>

          {/* Contextual loading block while deploying */}
          {loading && status && (
            <div className="loading-block">
              <div className="loading-phrase-row">
                <div className="loading-dot" />
                <span className="loading-phrase">{loadingPhrase}</span>
              </div>
              {deploymentId && (
                <div className="loading-id-row">
                  <span className="loading-id-label">ID</span>
                  <span className="loading-id-val">{deploymentId}</span>
                </div>
              )}
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {error && <div className="error-box">⚠ {error}</div>}

          {/* Full details shown after deployment completes */}
          {deploymentId && !loading && (
            <>
              <div className="divider" />

              <div className="meta-box">
                <div className="meta-row">
                  <span>Deployment ID</span>
                  <span className="meta-val">{deploymentId}</span>
                </div>
                <div className="meta-row">
                  <span>Status</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    {status === "deployed" && <div className="pulse" />}
                    <span
                      className="meta-val"
                      style={{ color: status === "deployed" ? "#22c55e" : "#b8b8b8" }}
                    >
                      {STATUS_LABELS[status] ?? status}
                    </span>
                  </div>
                </div>
              </div>

              <StatusTimeline status={status} />

              {deployedUrl && (
                <a className="deployed-link" href={deployedUrl} target="_blank" rel="noreferrer">
                  <div className="deployed-link-icon">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ color: "#3d7a53", fontSize: "10px", marginBottom: "2px", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Live</div>
                    <div style={{ fontSize: "12px", color: "#ccc" }}>{deployedUrl}</div>
                  </div>
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}