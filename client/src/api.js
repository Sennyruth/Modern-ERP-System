const BASE = "https://modern-erp-system.onrender.com/api"

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// Customers
export const getCustomers  = (params = "") => req("GET", `/customers?${params}`)
export const getCustomer   = (id) => req("GET", `/customers/${id}`)
export const createCustomer = (data) => req("POST", "/customers", data)
export const updateCustomer = (id, data) => req("PATCH", `/customers/${id}`, data)
export const deleteCustomer = (id) => req("DELETE", `/customers/${id}`)
export const getInteractions = (id) => req("GET", `/customers/${id}/interactions`)
export const createInteraction = (id, data) => req("POST", `/customers/${id}/interactions`, data)

// Orders
export const getOrders  = (params = "") => req("GET", `/orders?${params}`)
export const getOrder   = (id) => req("GET", `/orders/${id}`)
export const createOrder = (data) => req("POST", "/orders", data)
export const updateOrderStatus = (id, status) => req("PATCH", `/orders/${id}/status`, { status })

// Products
export const getProducts  = (params = "") => req("GET", `/products?${params}`)
export const getProduct   = (id) => req("GET", `/products/${id}`)
export const createProduct = (data) => req("POST", "/products", data)
export const updateProduct = (id, data) => req("PATCH", `/products/${id}`, data)

// Categories
export const getCategories  = () => req("GET", "/categories")
export const createCategory = (data) => req("POST", "/categories", data)

// Warehouses & Stock
export const getWarehouses  = () => req("GET", "/warehouses")
export const createWarehouse = (data) => req("POST", "/warehouses", data)
export const getStock       = (params = "") => req("GET", `/stock?${params}`)
export const receiveStock   = (data) => req("POST", "/stock/receive", data)
export const adjustStock    = (data) => req("POST", "/stock/adjust", data)
export const getMovements   = (params = "") => req("GET", `/stock/movements?${params}`)

// Employees
export const getEmployees  = (params = "") => req("GET", `/employees?${params}`)
export const getEmployee   = (id) => req("GET", `/employees/${id}`)
export const createEmployee = (data) => req("POST", "/employees", data)
export const updateEmployee = (id, data) => req("PATCH", `/employees/${id}`, data)
export const deleteEmployee = (id) => req("DELETE", `/employees/${id}`)

// Departments
export const getDepartments  = () => req("GET", "/departments")
export const createDepartment = (data) => req("POST", "/departments", data)

// Payroll
export const getPayrollRuns = () => req("GET", "/payroll/runs")
export const getPayrollRun  = (id) => req("GET", `/payroll/runs/${id}`)
export const createPayrollRun = (data) => req("POST", "/payroll/runs", data)
export const processPayrollRun = (id) => req("POST", `/payroll/runs/${id}/process`)
