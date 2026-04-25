import { useState } from "react"
import Sidebar from "./components/Sidebar"
import Dashboard from "./pages/Dashboard"
import Orders from "./pages/Orders"
import Customers from "./pages/Customers"
import Products from "./pages/Products"
import Warehouse from "./pages/Warehouse"
import Employees from "./pages/Employees"
import Payroll from "./pages/Payroll"
import "./index.css"

export default function App() {
  const [page, setPage] = useState("dashboard")

  const pages = {
    dashboard: <Dashboard />,
    orders: <Orders />,
    customers: <Customers />,
    products: <Products />,
    warehouse: <Warehouse />,
    employees: <Employees />,
    payroll: <Payroll />,
  }

  return (
    <div className="app-shell">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="main-area">
        {pages[page]}
      </main>
    </div>
  )
}
