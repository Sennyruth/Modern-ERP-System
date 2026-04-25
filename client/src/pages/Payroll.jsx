import { useState, useEffect } from "react"
import { getPayrollRuns, getPayrollRun, createPayrollRun, processPayrollRun } from "../api"
import { Spinner, StatusBadge, Toast, Modal, EmptyState } from "../components/UI"

export default function Payroll() {
  const [runs, setRuns]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]   = useState(null)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState({ periodFrom:"", periodTo:"" })
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState(null)

  function loadRuns() {
    setRuns(null)
    getPayrollRuns().then(setRuns).catch(() => setRuns([]))
  }

  useEffect(() => { loadRuns() }, [])

  useEffect(() => {
    if (!selected) { setDetail(null); return }
    setDetail(null)
    getPayrollRun(selected).then(setDetail).catch(() => setDetail({ entries:[] }))
  }, [selected])

  async function createRun() {
    setSaving(true)
    try {
      await createPayrollRun(form)
      setToast({ message:"Payroll run created", type:"success" })
      setModal(false); loadRuns()
    } catch(e) { setToast({ message:e.message, type:"error" }) }
    finally { setSaving(false) }
  }

  async function process(id) {
    try {
      const r = await processPayrollRun(id)
      setToast({ message:`Processed ${r.processed} entries`, type:"success" })
      loadRuns(); if (selected === id) getPayrollRun(id).then(setDetail)
    } catch(e) { setToast({ message:e.message, type:"error" }) }
  }

  const totalNet = (entries) => entries?.reduce((s, e) => s + Number(e.netPay), 0) ?? 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Payroll</div>
          <div className="page-sub">Manage payroll runs and employee compensation</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ periodFrom:"", periodTo:"" }); setModal(true) }}>+ Run payroll</button>
      </div>

      <div className="grid2">
        {/* Runs list */}
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">Payroll runs</div>
          </div>
          {!runs ? <Spinner /> : runs.length === 0 ? <EmptyState icon="◐" text="No payroll runs yet" /> : (
            <table>
              <thead>
                <tr><th>Period</th><th>Entries</th><th>Run date</th><th></th></tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} style={{ cursor:"pointer", background: selected === r.id ? "var(--bg3)" : undefined }} onClick={() => setSelected(r.id)}>
                    <td>
                      <div style={{ fontSize:12, fontWeight:500 }}>
                        {new Date(r.periodFrom).toLocaleDateString("en-KE", { month:"short", day:"numeric" })} — {new Date(r.periodTo).toLocaleDateString("en-KE", { month:"short", day:"numeric", year:"numeric" })}
                      </div>
                    </td>
                    <td style={{ color:"var(--text2)" }}>{r._count?.entries ?? "—"}</td>
                    <td style={{ color:"var(--text3)", fontSize:12 }}>{new Date(r.runDate || r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); process(r.id) }}>Process</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Run detail */}
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              {detail ? `Run entries — $${totalNet(detail.entries).toLocaleString(undefined, { minimumFractionDigits:2 })} total` : "Select a run"}
            </div>
          </div>
          {!selected ? (
            <EmptyState icon="◌" text="Click a payroll run to view entries" />
          ) : !detail ? <Spinner /> : detail.entries.length === 0 ? <EmptyState icon="◌" text="No entries in this run" /> : (
            <table>
              <thead>
                <tr><th>Employee</th><th>Base pay</th><th>Deductions</th><th>Bonuses</th><th>Net pay</th><th>Status</th></tr>
              </thead>
              <tbody>
                {detail.entries.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight:500 }}>{e.employee?.firstName} {e.employee?.lastName}</div>
                      <div style={{ fontSize:11, color:"var(--text3)" }}>{e.employee?.role}</div>
                    </td>
                    <td>${Number(e.basePay).toFixed(2)}</td>
                    <td style={{ color:"var(--rose)" }}>-${Number(e.deductions).toFixed(2)}</td>
                    <td style={{ color:"var(--green)" }}>+${Number(e.bonuses).toFixed(2)}</td>
                    <td style={{ fontFamily:"var(--font-head)", fontWeight:700, color:"var(--teal)" }}>${Number(e.netPay).toFixed(2)}</td>
                    <td><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal title="Create payroll run" onClose={() => setModal(false)}>
          <div className="form-group">
            <label className="form-label">Period from</label>
            <input className="form-input" type="date" value={form.periodFrom} onChange={e => setForm(p => ({ ...p, periodFrom: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Period to</label>
            <input className="form-input" type="date" value={form.periodTo} onChange={e => setForm(p => ({ ...p, periodTo: e.target.value }))} />
          </div>
          <div style={{ fontSize:12, color:"var(--text3)", marginTop:4 }}>
            This will auto-generate payroll entries for all active employees.
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={createRun} disabled={saving}>{saving ? "Creating..." : "Create run"}</button>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
