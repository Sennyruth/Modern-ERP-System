import { useState, useEffect, useCallback } from "react"
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "../api"
import { Spinner, StatusBadge, Toast, Modal, Pagination, EmptyState } from "../components/UI"

const initForm = { firstName:"", lastName:"", email:"", phone:"", segment:"new" }

export default function Customers() {
  const [data, setData]       = useState(null)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState("")
  const [segment, setSegment] = useState("")
  const [modal, setModal]     = useState(null) // null | "create" | customer obj
  const [form, setForm]       = useState(initForm)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState(null)

  const load = useCallback(() => {
    setData(null)
    const params = new URLSearchParams({ page, limit: 15, ...(search && { search }), ...(segment && { segment }) })
    getCustomers(params.toString()).then(setData).catch(() => setToast({ message: "Failed to load", type: "error" }))
  }, [page, search, segment])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm(initForm); setModal("create") }
  function openEdit(c)  { setForm({ firstName:c.firstName, lastName:c.lastName, email:c.email, phone:c.phone||"", segment:c.segment }); setModal(c) }

  async function save() {
    setSaving(true)
    try {
      if (modal === "create") {
        await createCustomer(form)
        setToast({ message: "Customer created", type: "success" })
      } else {
        await updateCustomer(modal.id, form)
        setToast({ message: "Customer updated", type: "success" })
      }
      setModal(null); load()
    } catch(e) {
      setToast({ message: e.message, type: "error" })
    } finally { setSaving(false) }
  }

  async function remove(id) {
    if (!confirm("Delete this customer?")) return
    try {
      await deleteCustomer(id)
      setToast({ message: "Customer deleted", type: "success" })
      load()
    } catch(e) { setToast({ message: e.message, type: "error" }) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Customers</div>
          <div className="page-sub">CRM — manage your customer base</div>
        </div>
        <div className="flex gap-8">
          <div className="search-bar">
            <span className="search-icon">⌕</span>
            <input placeholder="Search customers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select value={segment} onChange={e => { setSegment(e.target.value); setPage(1) }}>
            <option value="">All segments</option>
            <option value="new">New</option>
            <option value="regular">Regular</option>
            <option value="vip">VIP</option>
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ Add customer</button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">{data ? `${data.total} customers` : "Customers"}</div>
        </div>
        {!data ? <Spinner /> : data.data.length === 0 ? <EmptyState icon="◉" text="No customers found" /> : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Segment</th>
                  <th>Orders</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex-center gap-8">
                        <div className="avatar" style={{ background:"rgba(108,99,255,0.15)", color:"var(--accent2)", fontSize:11 }}>
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <span>{c.firstName} {c.lastName}</span>
                      </div>
                    </td>
                    <td style={{ color:"var(--text2)" }}>{c.email}</td>
                    <td style={{ color:"var(--text2)" }}>{c.phone || "—"}</td>
                    <td><StatusBadge status={c.segment} /></td>
                    <td style={{ color:"var(--text2)" }}>{c._count?.orders ?? "—"}</td>
                    <td style={{ color:"var(--text3)", fontSize:12 }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color:"var(--rose)" }} onClick={() => remove(c.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={data.total} limit={15} onPage={setPage} />
          </>
        )}
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Add customer" : "Edit customer"} onClose={() => setModal(null)}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First name</label>
              <input className="form-input" value={form.firstName} onChange={e => f("firstName", e.target.value)} placeholder="Amara" />
            </div>
            <div className="form-group">
              <label className="form-label">Last name</label>
              <input className="form-input" value={form.lastName} onChange={e => f("lastName", e.target.value)} placeholder="Osei" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => f("email", e.target.value)} placeholder="amara@example.com" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="+254700000001" />
            </div>
            <div className="form-group">
              <label className="form-label">Segment</label>
              <select className="form-input" value={form.segment} onChange={e => f("segment", e.target.value)} style={{ width:"100%" }}>
                <option value="new">New</option>
                <option value="regular">Regular</option>
                <option value="vip">VIP</option>
              </select>
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
