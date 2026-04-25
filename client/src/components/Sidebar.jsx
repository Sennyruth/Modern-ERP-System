import "./Sidebar.css"

const nav = [
  { id: "dashboard", label: "Dashboard",  group: "Overview" },
  { id: "orders",    label: "Orders",     group: "Sales & CRM" },
  { id: "customers", label: "Customers",  group: "Sales & CRM" },
  { id: "products",  label: "Products",   group: "Inventory" },
  { id: "warehouse", label: "Warehouse",  group: "Inventory" },
  { id: "employees", label: "Employees",  group: "HR & Payroll" },
  { id: "payroll",   label: "Payroll",    group: "HR & Payroll" },
]

const groups = [...new Set(nav.map(n => n.group))]

export default function Sidebar({ current, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">R</div>
        <div>
          <div className="logo-name">RetailOS</div>
          <div className="logo-sub">ERP Platform</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {groups.map(group => (
          <div key={group} className="nav-group">
            <div className="nav-group-label">{group}</div>
            {nav.filter(n => n.group === group).map(item => (
              <button
                key={item.id}
                className={`nav-item ${current === item.id ? "active" : ""}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className="nav-dot" />
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar" style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c", width: 34, height: 34, fontSize: 12, fontWeight: 800 }}>A</div>
        <div>
          <div className="name">Admin User</div>
          <div className="role">Administrator</div>
        </div>
      </div>
    </aside>
  )
}
