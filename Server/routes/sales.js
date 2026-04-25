// src/routes/sales.js
// Sales & CRM — Customers, Orders, CRM Interactions

import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// ============================================================
// CUSTOMERS
// ============================================================

// GET /customers — list with pagination & segment filter
router.get('/customers', async (req, res) => {
  const { page = 1, limit = 20, segment, search } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where = {
    ...(segment && { segment }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where, skip, take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    }),
    prisma.customer.count({ where }),
  ])

  res.json({ data: customers, total, page: Number(page), limit: Number(limit) })
})

// GET /customers/:id
router.get('/customers/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      orders: { orderBy: { createdAt: 'desc' }, take: 10 },
      interactions: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })
  res.json(customer)
})

// POST /customers
router.post('/customers', async (req, res) => {
  const { firstName, lastName, email, phone, segment, countryCode } = req.body
  console.log("REQ BODY:", req.body);
  const customer = await prisma.customer.create({
    data: { firstName, lastName, email, phone, segment, countryCode },
  })
  res.status(201).json(customer)
})

// PATCH /customers/:id
router.patch('/customers/:id', async (req, res) => {
  const { firstName, lastName, email, phone, segment, countryCode } = req.body
  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: { firstName, lastName, email, phone, segment, countryCode },
  })
  res.json(customer)
})

// DELETE /customers/:id
router.delete('/customers/:id', async (req, res) => {
  await prisma.customer.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

// ============================================================
// ORDERS
// ============================================================

// GET /orders
router.get('/orders', async (req, res) => {
  const { page = 1, limit = 20, status, channel, customerId } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where = {
    ...(status     && { status }),
    ...(channel    && { channel }),
    ...(customerId && { customerId }),
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where, skip, take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ])

  res.json({ data: orders, total, page: Number(page), limit: Number(limit) })
})

// GET /orders/:id
router.get('/orders/:id', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      items: { include: { product: { select: { sku: true, name: true } } } },
    },
  })
  res.json(order)
})

// POST /orders — creates order + items + reserves stock in one transaction
router.post('/orders', async (req, res) => {
  const { customerId, channel, shippingAddr, notes, items } = req.body
  // items: [{ productId, qty, unitPrice }]

  const order = await prisma.$transaction(async (tx) => {
    // 1. Validate stock availability
    for (const item of items) {
      const stock = await tx.stock.findFirst({
        where: { productId: item.productId },
      })
      if (!stock || stock.qtyOnHand - stock.qtyReserved < item.qty) {
        throw new Error(`Insufficient stock for product ${item.productId}`)
      }
    }

    // 2. Fetch product names/skus
    const productIds = items.map(i => i.productId)
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, sku: true, name: true },
    })
    const productMap = Object.fromEntries(products.map(p => [p.id, p]))

    // 3. Compute subtotal
    const subtotal = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)
    const tax = subtotal * 0.16  // 16% VAT (adjust per region)

    // 4. Create order with items
    const newOrder = await tx.order.create({
      data: {
        customerId, channel, shippingAddr, notes,
        subtotal, tax,
        items: {
          create: items.map(i => ({
            productId: i.productId,
            sku: productMap[i.productId].sku,
            name: productMap[i.productId].name,
            qty: i.qty,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    })

    // 5. Reserve stock & record movements
    for (const item of items) {
      await tx.stock.updateMany({
        where: { productId: item.productId },
        data: { qtyReserved: { increment: item.qty } },
      })
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          warehouseId: (await tx.stock.findFirst({ where: { productId: item.productId } })).warehouseId,
          movementType: 'sale',
          qty: -item.qty,
          referenceId: newOrder.id,
        },
      })
    }

    return newOrder
  })

  res.status(201).json(order)
})

// PATCH /orders/:id/status
router.patch('/orders/:id/status', async (req, res) => {
  const { status } = req.body
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
  })
  res.json(order)
})

// ============================================================
// CRM INTERACTIONS
// ============================================================

// GET /customers/:id/interactions
router.get('/customers/:id/interactions', async (req, res) => {
  const interactions = await prisma.crmInteraction.findMany({
    where: { customerId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: {
      handledBy: { select: { firstName: true, lastName: true } },
    },
  })
  res.json(interactions)
})

// POST /customers/:id/interactions
router.post('/customers/:id/interactions', async (req, res) => {
  const { type, summary, handledById } = req.body
  const interaction = await prisma.crmInteraction.create({
    data: { customerId: req.params.id, type, summary, handledById },
  })
  res.status(201).json(interaction)
})

export default router
