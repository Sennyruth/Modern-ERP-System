import { useState, useEffect } from "react"
import { getWarehouses, getStock, getMovements, receiveStock, adjustStock } from "../api"
import { Spinner, Toast, Modal, EmptyState } from "../components/UI"

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState(null)
  const [stock, setStock]           = useState(null)
  const [movements, setMovements]   = useState(null)
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState({ productId:"", warehouseId:"", qty:"", note:"" })
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)

  function load() {
    getWarehouses().then(setWarehouses).catch(() => setWarehouses([]))
    getStock().then(setStock).catch(() => setStock([]))
    getMovements("limit=20").then(d => setMovements(d.data)).catch(() => setMovements([]))
  }

  useEffect(() => { load() }, [])

  async function handleReceive() {
    setSaving(true)
    try {
      await receiveStock({ ...form, qty: Number(form.qty) })
      setToast({ message:"Stock received successfully", type:"success" })
      setModal(null); load()
    } catch(e) { setToast({ message:e.message, type:"error" }) }
    finally { setSaving(false) }
  }

  async function handleAdjust() {
    setSaving(true)
    try {
      await adjustStock({ ...form, qty: Number(form.qty) })
      setToast({ message:"Stock adjusted", type:"success" })
      setModal(null); load()
    } catch(e) { setToast({ message:e.message, type:"error" }) }
    finally { setSaving(false) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const loading = !warehouses || !stock || !movements

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Warehouse</div>
          <div className="page-sub">Stock levels, movements and warehouse management</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost" onClick={() => { setForm({ productId:"", warehouseId:"", qty:"", note:"" }); setModal("adjust") }}>Adjust stock</button>
          <button className="btn btn-primary" onClick={() => { setForm({ productId:"", warehouseId:"", qty:"", note:"" }); setModal("receive") }}>+ Receive stock</button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Warehouses */}
          <div className="grid2 mt-16" style={{ marginBottom:20 }}>
            {warehouses.length === 0 ? (
              <div className="table-card" style={{ gridColumn:"1/-1" }}><EmptyState icon="◫" text="No warehouses configured" /></div>
            ) : warehouses.map(w => (
              <div key={w.id} className="table-card">
                <div className="table-card-header">
                  <div className="table-card-title">{w.name}</div>
                  <span className="badge badge-teal">{w._count?.stock ?? 0} products</span>
                </div>
                <div style={{ padding:"14px 20px" }}>
                  <div style={{ fontSize:12, color:"var(--text3)", marginBottom:8 }}>{w.location || "No location set"}</div>
                  {w.zones?.map(z => (
                    <div key={z.id} style={{ fontSize:12, color:"var(--text2)", display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)", display:"inline-block" }} />
                      {z.name} {z.description && `— ${z.description}`}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Stock levels */}
          <div className="table-card" style={{ marginBottom:20 }}>
            <div className="table-card-header">
              <div className="table-card-title">Stock levels</div>
            </div>
            {stock.length === 0 ? <EmptyState icon="◧" text="No stock records found" /> : (
              <table>
                <thead>
                  <tr><th>Product</th><th>SKU</th><th>Warehouse</th><th>Zone</th><th>On hand</th><th>Reserved</th><th>Available</th></tr>
                </thead>
                <tbody>
                  {stock.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight:500 }}>{s.product?.name || "—"}</td>
                      <td style={{ fontFamily:"monospace", fontSize:11, color:"var(--text2)" }}>{s.product?.sku || "—"}</td>
                      <td style={{ color:"var(--text2)" }}>{s.warehouse?.name || "—"}</td>
                      <td style={{ color:"var(--text3)" }}>{s.zone?.name || "—"}</td>
                      <td>{s.qtyOnHand}</td>
                      <td style={{ color:"var(--text3)" }}>{s.qtyReserved}</td>
                      <td>
                        <span className={`badge ${s.qtyAvailable <= (s.product?.reorderPoint || 10) ? "badge-rose" : "badge-green"}`}>
                          {s.qtyAvailable ?? s.qtyOnHand - s.qtyReserved}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Movements */}
          <div className="table-card">
            <div className="table-card-header">
              <div className="table-card-title">Recent movements</div>
            </div>
            {movements.length === 0 ? <EmptyState icon="◌" text="No stock movements yet" /> : (
              <table>
                <thead>
                  <tr><th>Product</th><th>Type</th><th>Qty</th><th>Warehouse</th><th>Note</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight:500 }}>{m.product?.name || "—"}</td>
                      <td>
                        <span className={`badge ${m.movementType === "receipt" ? "badge-green" : m.movementType === "sale" ? "badge-blue" : m.movementType === "return" ? "badge-teal" : "badge-amber"}`}>
                          {m.movementType}
                        </span>
                      </td>
                      <td style={{ color: m.qty > 0 ? "var(--green)" : "var(--rose)", fontWeight:600 }}>
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </td>
                      <td style={{ color:"var(--text2)" }}>{m.warehouse?.name || "—"}</td>
                      <td style={{ color:"var(--text3)" }}>{m.note || "—"}</td>
                      <td style={{ color:"var(--text3)", fontSize:12 }}>{new Date(m.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {(modal === "receive" || modal === "adjust") && (
        <Modal title={modal === "receive" ? "Receive stock" : "Adjust stock"} onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Product ID</label>
            <input className="form-input" value={form.productId} onChange={e => f("productId", e.target.value)} placeholder="Paste product UUID" />
          </div>
          <div className="form-group">
            <label className="form-label">Warehouse ID</label>
            <input className="form-input" value={form.warehouseId} onChange={e => f("warehouseId", e.target.value)} placeholder="Paste warehouse UUID" />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity {modal === "adjust" && "(negative to reduce)"}</label>
            <input className="form-input" type="number" value={form.qty} onChange={e => f("qty", e.target.value)} placeholder={modal === "adjust" ? "-5 or +10" : "100"} />
          </div>
          <div className="form-group">
            <label className="form-label">Note</label>
            <input className="form-input" value={form.note} onChange={e => f("note", e.target.value)} placeholder="Optional note..." />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={modal === "receive" ? handleReceive : handleAdjust} disabled={saving}>
              {saving ? "Saving..." : modal === "receive" ? "Receive" : "Adjust"}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
