import { useState, useEffect } from "react"
import { getOrders, getCustomers, getProducts, getEmployees } from "../api"
import { Spinner, StatusBadge } from "../components/UI"

export default function Dashboard() {
  const [orders,    setOrders]    = useState(null)
  const [customers, setCustomers] = useState(null)
  const [products,  setProducts]  = useState(null)
  const [employees, setEmployees] = useState(null)

  useEffect(() => {
    getOrders("limit=6").then(setOrders).catch(() => setOrders({ data: [], total: 0 }))
    getCustomers("limit=1").then(setCustomers).catch(() => setCustomers({ total: 0 }))
    getProducts("limit=1").then(setProducts).catch(() => setProducts({ total: 0 }))
    getEmployees("limit=1").then(setEmployees).catch(() => setEmployees({ total: 0 }))
  }, [])

  const loading = !orders || !customers || !products || !employees

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Overview</div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Your retail operations at a glance</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "var(--ink4)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Today</div>
          <div style={{ fontSize: 16, fontFamily: "var(--font-disp)", fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
            {new Date().toLocaleDateString("en-KE", { weekday:"long", month:"long", day:"numeric" })}
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="metrics-grid">
            <div className="metric-card" style={{ "--accent-color": "var(--gold)" }}>
              <div className="metric-label">Total orders</div>
              <div className="metric-value">{orders.total}</div>
              <div className="metric-change up">▲ Active pipeline</div>
            </div>
            <div className="metric-card" style={{ "--accent-color": "var(--emerald)" }}>
              <div className="metric-label">Customers</div>
              <div className="metric-value">{customers.total}</div>
              <div className="metric-change neutral">Registered accounts</div>
            </div>
            <div className="metric-card" style={{ "--accent-color": "var(--sapphire)" }}>
              <div className="metric-label">Products</div>
              <div className="metric-value">{products.total}</div>
              <div className="metric-change neutral">Active SKUs</div>
            </div>
            <div className="metric-card" style={{ "--accent-color": "var(--crimson)" }}>
              <div className="metric-label">Employees</div>
              <div className="metric-value">{employees.total}</div>
              <div className="metric-change neutral">On roster</div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-card-header">
              <div>
                <div className="table-card-title">Recent orders</div>
                <div style={{ fontSize: 11, color: "var(--ink4)", marginTop: 3, fontWeight: 500 }}>Latest {orders.data.length} transactions</div>
              </div>
            </div>

            {orders.data.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", color: "var(--ink4)" }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>—</div>
                No orders yet
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Order ref</th>
                    <th>Customer</th>
                    <th>Channel</th>
                    <th>Subtotal</th>
                    <th>Tax</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink4)", letterSpacing: "0.04em" }}>
                        {o.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : "—"}
                      </td>
                      <td><StatusBadge status={o.channel} /></td>
                      <td style={{ color: "var(--ink3)" }}>${Number(o.subtotal).toFixed(2)}</td>
                      <td style={{ color: "var(--ink4)" }}>${Number(o.tax).toFixed(2)}</td>
                      <td style={{ fontFamily: "var(--font-disp)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
                        ${(Number(o.subtotal) + Number(o.tax) - Number(o.discount || 0)).toFixed(2)}
                      </td>
                      <td><StatusBadge status={o.status} /></td>
                      <td style={{ color: "var(--ink4)", fontSize: 12 }}>
                        {new Date(o.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
