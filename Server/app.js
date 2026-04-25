// src/app.js
// RetailOS ERP — Express App Entry Point

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { PrismaClient } from '@prisma/client'

import salesRouter     from './routes/sales.js'
import inventoryRouter from './routes/inventory.js'
import hrRouter        from './routes/hr.js'

const app = express()
const prisma = new PrismaClient()

// ── Middleware ────────────────────────────────────────────
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://modern-erp-system-1.onrender.com"  // add your actual frontend URL
  ]
}))

// ── Health check ──────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: 'connected' })
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' })
  }
})

// ── API Routes ────────────────────────────────────────────
app.use('/api', salesRouter)      // /api/customers, /api/orders
app.use('/api', inventoryRouter)  // /api/products, /api/stock, /api/warehouses
app.use('/api', hrRouter)         // /api/employees, /api/payroll

// ── Global error handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err)

  // Prisma not-found errors
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' })
  }
  // Prisma unique constraint violations
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that value already exists' })
  }

  res.status(500).json({ error: err.message || 'Internal server error' })
})

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`RetailOS ERP API running on http://localhost:${PORT}`)
})

export default app
