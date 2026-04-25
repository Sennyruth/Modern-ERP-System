import { useEffect } from "react"

export function Spinner() {
  return <div className="loading"><div className="spinner" /><span>Loading...</span></div>
}

export function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`toast ${type}`}>
      <span>{type === "success" ? "✓" : "✕"}</span>
      {message}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 20 }}>
          <div className="modal-title">{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text3)", cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    pending:    "badge-amber",
    processing: "badge-blue",
    fulfilled:  "badge-green",
    returned:   "badge-rose",
    cancelled:  "badge-gray",
    active:     "badge-green",
    on_leave:   "badge-amber",
    terminated: "badge-rose",
    processed:  "badge-green",
    failed:     "badge-rose",
    new:        "badge-teal",
    regular:    "badge-blue",
    vip:        "badge-amber",
    online:     "badge-blue",
    in_store:   "badge-teal",
    phone:      "badge-gray",
    full_time:  "badge-blue",
    part_time:  "badge-gray",
    contractor: "badge-teal",
  }
  return <span className={`badge ${map[status] || "badge-gray"}`}>{status?.replace("_", " ")}</span>
}

export function EmptyState({ icon = "◌", text = "No data found" }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-text">{text}</div>
    </div>
  )
}

export function Pagination({ page, total, limit, onPage }) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <span className="page-info">Showing {Math.min((page-1)*limit+1, total)}–{Math.min(page*limit, total)} of {total}</span>
      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page-1)}>← Prev</button>
      <span style={{ fontSize:12, color:"var(--text3)" }}>{page} / {totalPages}</span>
      <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onPage(page+1)}>Next →</button>
    </div>
  )
}
