import { useState, useEffect, useCallback } from "react"
import { getOrders, updateOrderStatus } from "../api"
import { Spinner, StatusBadge, Toast, Pagination, EmptyState } from "../components/UI"

const STATUSES = ["pending","processing","fulfilled","returned","cancelled"]

export default function Orders() {
  const [data, setData]       = useState(null)
  const [page, setPage]       = useState(1)
  const [status, setStatus]   = useState("")
  const [toast, setToast]     = useState(null)

  const load = useCallback(() => {
    setData(null)
    const params = new URLSearchParams({ page, limit: 15, ...(status && { status }) })
    getOrders(params.toString())
      .then(setData)
      .catch(() => setToast({ message: "Failed to load orders", type: "error" }))
  }, [page, status])

  useEffect(() => { load() }, [load])

  async function changeStatus(id, newStatus) {
    try {
      await updateOrderStatus(id, newStatus)
      setToast({ message: "Order status updated", type: "success" })
      load()
    } catch (e) {
      setToast({ message: e.message, type: "error" })
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Orders</div>
          <div className="page-sub">Manage and track all customer orders</div>
        </div>
        <div className="flex gap-8">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">
            {data ? `${data.total} orders` : "Orders"}
          </div>
        </div>

        {!data ? <Spinner /> : data.data.length === 0 ? <EmptyState icon="◈" text="No orders found" /> : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontFamily:"monospace", fontSize:11, color:"var(--text2)" }}>#{o.id.slice(0,8)}</td>
                    <td>
                      {o.customer
                        ? <span>{o.customer.firstName} {o.customer.lastName}</span>
                        : <span style={{ color:"var(--text3)" }}>—</span>}
                    </td>
                    <td style={{ color:"var(--text2)" }}>{o._count?.items ?? "—"}</td>
                    <td>${Number(o.subtotal).toFixed(2)}</td>
                    <td style={{ color:"var(--text3)" }}>${Number(o.tax).toFixed(2)}</td>
                    <td style={{ fontFamily:"var(--font-head)", fontWeight:600, color:"var(--teal)" }}>
                      ${(Number(o.subtotal) + Number(o.tax) - Number(o.discount)).toFixed(2)}
                    </td>
                    <td><StatusBadge status={o.channel} /></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td style={{ color:"var(--text3)", fontSize:12 }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>
                      <select
                        value={o.status}
                        onChange={e => changeStatus(o.id, e.target.value)}
                        style={{ padding:"4px 8px", fontSize:11 }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={data.total} limit={15} onPage={setPage} />
          </>
        )}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
