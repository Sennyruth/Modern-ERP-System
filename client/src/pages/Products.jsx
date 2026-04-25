import { useState, useEffect, useCallback } from "react"
import { getProducts, createProduct, updateProduct, getCategories } from "../api"
import { Spinner, Toast, Modal, Pagination, EmptyState } from "../components/UI"

const initForm = { sku:"", name:"", description:"", categoryId:"", costPrice:"", sellPrice:"", reorderPoint:10, reorderQty:50 }

export default function Products() {
  const [data, setData]           = useState(null)
  const [categories, setCategories] = useState([])
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState("")
  const [lowStock, setLowStock]   = useState(false)
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(initForm)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)

  const load = useCallback(() => {
    setData(null)
    const params = new URLSearchParams({ page, limit:15, ...(search && { search }), ...(lowStock && { lowStock:"true" }) })
    getProducts(params.toString()).then(setData).catch(() => setToast({ message:"Failed to load", type:"error" }))
  }, [page, search, lowStock])

  useEffect(() => { load() }, [load])
  useEffect(() => { getCategories().then(setCategories).catch(() => {}) }, [])

  function openCreate() { setForm(initForm); setModal("create") }
  function openEdit(p) {
    setForm({ sku:p.sku, name:p.name, description:p.description||"", categoryId:p.categoryId||"", costPrice:p.costPrice, sellPrice:p.sellPrice, reorderPoint:p.reorderPoint, reorderQty:p.reorderQty })
    setModal(p)
  }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, categoryId: form.categoryId ? Number(form.categoryId) : undefined, costPrice: Number(form.costPrice), sellPrice: Number(form.sellPrice), reorderPoint: Number(form.reorderPoint), reorderQty: Number(form.reorderQty) }
      if (modal === "create") {
        await createProduct(payload)
        setToast({ message:"Product created", type:"success" })
      } else {
        await updateProduct(modal.id, payload)
        setToast({ message:"Product updated", type:"success" })
      }
      setModal(null); load()
    } catch(e) { setToast({ message:e.message, type:"error" }) }
    finally { setSaving(false) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const stockQty = (p) => p.stock?.reduce((s, st) => s + st.qtyOnHand - st.qtyReserved, 0) ?? "—"
  const stockStatus = (p) => {
    const qty = stockQty(p)
    if (qty === "—") return null
    if (qty <= p.reorderPoint) return qty <= 5 ? "badge-rose" : "badge-amber"
    return "badge-green"
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Products</div>
          <div className="page-sub">Manage your product catalogue and stock levels</div>
        </div>
        <div className="flex gap-8">
          <div className="search-bar">
            <span className="search-icon">⌕</span>
            <input placeholder="Search SKU or name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <button className={`btn ${lowStock ? "btn-primary" : "btn-ghost"}`} onClick={() => { setLowStock(p => !p); setPage(1) }}>
            {lowStock ? "◈ Low stock" : "Low stock"}
          </button>
          <button className="btn btn-primary" onClick={openCreate}>+ Add product</button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">{data ? `${data.total} products` : "Products"}</div>
        </div>
        {!data ? <Spinner /> : data.data.length === 0 ? <EmptyState icon="◧" text="No products found" /> : (
          <>
            <table>
              <thead>
                <tr>
                  <th>SKU</th><th>Name</th><th>Category</th>
                  <th>Cost</th><th>Price</th><th>Stock</th>
                  <th>Reorder at</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily:"monospace", fontSize:11, color:"var(--text2)" }}>{p.sku}</td>
                    <td style={{ fontWeight:500 }}>{p.name}</td>
                    <td style={{ color:"var(--text2)" }}>{p.category?.name || "—"}</td>
                    <td style={{ color:"var(--text3)" }}>${Number(p.costPrice).toFixed(2)}</td>
                    <td style={{ fontFamily:"var(--font-head)", fontWeight:600, color:"var(--teal)" }}>${Number(p.sellPrice).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${stockStatus(p) || "badge-gray"}`}>
                        {stockQty(p)} units
                      </span>
                    </td>
                    <td style={{ color:"var(--text3)" }}>{p.reorderPoint}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
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
        <Modal title={modal === "create" ? "Add product" : "Edit product"} onClose={() => setModal(null)}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input className="form-input" value={form.sku} onChange={e => f("sku", e.target.value)} placeholder="SKU-010" disabled={modal !== "create"} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={form.categoryId} onChange={e => f("categoryId", e.target.value)} style={{ width:"100%" }}>
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Product name</label>
            <input className="form-input" value={form.name} onChange={e => f("name", e.target.value)} placeholder="Basketball sneakers Pro" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={e => f("description", e.target.value)} placeholder="Short description..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cost price ($)</label>
              <input className="form-input" type="number" value={form.costPrice} onChange={e => f("costPrice", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Sell price ($)</label>
              <input className="form-input" type="number" value={form.sellPrice} onChange={e => f("sellPrice", e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Reorder point</label>
              <input className="form-input" type="number" value={form.reorderPoint} onChange={e => f("reorderPoint", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Reorder qty</label>
              <input className="form-input" type="number" value={form.reorderQty} onChange={e => f("reorderQty", e.target.value)} />
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
