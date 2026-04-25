import { useState, useEffect, useCallback } from "react"
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getDepartments } from "../api"
import { Spinner, StatusBadge, Toast, Modal, Pagination, EmptyState } from "../components/UI"

const initForm = { firstName:"", lastName:"", email:"", phone:"", role:"", departmentId:"", employmentType:"full_time", startDate:"", baseSalary:"" }

const avatarColors = [
  ["rgba(108,99,255,0.2)","#a78bfa"],
  ["rgba(45,212,191,0.2)","#2dd4bf"],
  ["rgba(251,191,36,0.2)","#fbbf24"],
  ["rgba(251,113,133,0.2)","#fb7185"],
  ["rgba(74,222,128,0.2)","#4ade80"],
]

export default function Employees() {
  const [data, setData]             = useState(null)
  const [departments, setDepts]     = useState([])
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState("")
  const [status, setStatus]         = useState("")
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(initForm)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)

  const load = useCallback(() => {
    setData(null)
    const params = new URLSearchParams({ page, limit:15, ...(search && { search }), ...(status && { status }) })
    getEmployees(params.toString()).then(setData).catch(() => setToast({ message:"Failed to load", type:"error" }))
  }, [page, search, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { getDepartments().then(setDepts).catch(() => {}) }, [])

  function openCreate() { setForm(initForm); setModal("create") }
  function openEdit(e) {
    setForm({ firstName:e.firstName, lastName:e.lastName, email:e.email, phone:e.phone||"", role:e.role, departmentId:e.departmentId||"", employmentType:e.employmentType, startDate:e.startDate?.slice(0,10)||"", baseSalary:e.baseSalary })
    setModal(e)
  }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, departmentId: form.departmentId ? Number(form.departmentId) : undefined, baseSalary: Number(form.baseSalary) }
      if (modal === "create") {
        await createEmployee(payload)
        setToast({ message:"Employee added", type:"success" })
      } else {
        await updateEmployee(modal.id, payload)
        setToast({ message:"Employee updated", type:"success" })
      }
      setModal(null); load()
    } catch(e) { setToast({ message:e.message, type:"error" }) }
    finally { setSaving(false) }
  }

  async function terminate(id) {
    if (!confirm("Terminate this employee? This will soft-delete them.")) return
    try {
      await deleteEmployee(id)
      setToast({ message:"Employee terminated", type:"success" })
      load()
    } catch(e) { setToast({ message:e.message, type:"error" }) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const color = (i) => avatarColors[i % avatarColors.length]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Employees</div>
          <div className="page-sub">HR — manage your team and workforce</div>
        </div>
        <div className="flex gap-8">
          <div className="search-bar">
            <span className="search-icon">⌕</span>
            <input placeholder="Search employees..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="terminated">Terminated</option>
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ Add employee</button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">{data ? `${data.total} employees` : "Employees"}</div>
        </div>
        {!data ? <Spinner /> : data.data.length === 0 ? <EmptyState icon="◎" text="No employees found" /> : (
          <>
            <table>
              <thead>
                <tr><th>Name</th><th>Role</th><th>Department</th><th>Type</th><th>Salary</th><th>Start date</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {data.data.map((e, i) => {
                  const [bg, col] = color(i)
                  return (
                    <tr key={e.id}>
                      <td>
                        <div className="flex-center gap-8">
                          <div className="avatar" style={{ background:bg, color:col, fontSize:11 }}>
                            {e.firstName[0]}{e.lastName[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight:500 }}>{e.firstName} {e.lastName}</div>
                            <div style={{ fontSize:11, color:"var(--text3)" }}>{e.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color:"var(--text2)" }}>{e.role}</td>
                      <td style={{ color:"var(--text2)" }}>{e.department?.name || "—"}</td>
                      <td><StatusBadge status={e.employmentType} /></td>
                      <td style={{ fontFamily:"var(--font-head)", fontWeight:600, color:"var(--teal)" }}>${Number(e.baseSalary).toLocaleString()}</td>
                      <td style={{ color:"var(--text3)", fontSize:12 }}>{e.startDate ? new Date(e.startDate).toLocaleDateString() : "—"}</td>
                      <td><StatusBadge status={e.status} /></td>
                      <td>
                        <div className="flex gap-8">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>Edit</button>
                          {e.status !== "terminated" && (
                            <button className="btn btn-ghost btn-sm" style={{ color:"var(--rose)" }} onClick={() => terminate(e.id)}>Terminate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pagination page={page} total={data.total} limit={15} onPage={setPage} />
          </>
        )}
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Add employee" : "Edit employee"} onClose={() => setModal(null)}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First name</label>
              <input className="form-input" value={form.firstName} onChange={e => f("firstName", e.target.value)} placeholder="Kofi" />
            </div>
            <div className="form-group">
              <label className="form-label">Last name</label>
              <input className="form-input" value={form.lastName} onChange={e => f("lastName", e.target.value)} placeholder="Agyeman" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => f("email", e.target.value)} placeholder="kofi@retailos.com" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="+254700000002" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input className="form-input" value={form.role} onChange={e => f("role", e.target.value)} placeholder="Sales associate" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-input" value={form.departmentId} onChange={e => f("departmentId", e.target.value)} style={{ width:"100%" }}>
                <option value="">None</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Employment type</label>
              <select className="form-input" value={form.employmentType} onChange={e => f("employmentType", e.target.value)} style={{ width:"100%" }}>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start date</label>
              <input className="form-input" type="date" value={form.startDate} onChange={e => f("startDate", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Base salary ($)</label>
              <input className="form-input" type="number" value={form.baseSalary} onChange={e => f("baseSalary", e.target.value)} placeholder="2400" />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
