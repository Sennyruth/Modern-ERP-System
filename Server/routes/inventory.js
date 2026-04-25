// src/routes/inventory.js
// Inventory & Warehouse — Products, Stock, Movements, Warehouses

import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// ============================================================
// PRODUCTS
// ============================================================

// GET /products
router.get('/products', async (req, res) => {
  const { page = 1, limit = 20, categoryId, search, lowStock } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where = {
    isActive: true,
    ...(categoryId && { categoryId: Number(categoryId) }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku:  { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, skip, take: Number(limit),
      orderBy: { name: 'asc' },
      include: {
        category: { select: { name: true } },
        stock: {
          select: { qtyOnHand: true, qtyReserved: true, warehouseId: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ])

  // Optionally filter to only low-stock items
  const filtered = lowStock === 'true'
    ? products.filter(p => {
        const totalQty = p.stock.reduce((s, st) => s + st.qtyOnHand - st.qtyReserved, 0)
        return totalQty <= p.reorderPoint
      })
    : products

  res.json({ data: filtered, total, page: Number(page), limit: Number(limit) })
})

// GET /products/:id
router.get('/products/:id', async (req, res) => {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      category: true,
      stock: { include: { warehouse: true, zone: true } },
      movements: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  res.json(product)
})

// POST /products
router.post('/products', async (req, res) => {
  const { sku, name, description, categoryId, costPrice, sellPrice, reorderPoint, reorderQty } = req.body;

  // 🔴 Validate category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId }
  });

  if (!category) {
    return res.status(400).json({ error: "Invalid categoryId" });
  }

 const product = await prisma.product.create({
  data: {
    sku,
    name,
    description,
    costPrice,
    sellPrice,
    reorderPoint,
    reorderQty,
    category: {
    connect: { id: categoryId }
    }
  }
});

  res.status(201).json(product);
});

// PATCH /products/:id
router.patch('/products/:id', async (req, res) => {
  const { categoryId, ...rest } = req.body;

  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(400).json({ error: "Invalid categoryId" });
    }
  }

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { ...rest, ...(categoryId && { categoryId }) },
  });

  res.json(product);
});
// ============================================================
// STOCK
// ============================================================

// GET /stock — overview of all stock levels
router.get('/stock', async (req, res) => {
  const { warehouseId, productId } = req.query

  const stock = await prisma.stock.findMany({
    where: {
      ...(warehouseId && { warehouseId }),
      ...(productId   && { productId }),
    },
    include: {
      product:   { select: { sku: true, name: true, reorderPoint: true } },
      warehouse: { select: { name: true } },
      zone:      { select: { name: true } },
    },
  })

  res.json(stock)
})

// POST /stock/adjust — manual stock adjustment
router.post('/stock/adjust', async (req, res) => {
  const { productId, warehouseId, qty, note, createdById } = req.body

  const result = await prisma.$transaction(async (tx) => {
    // Upsert stock record
    const stock = await tx.stock.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      create: { productId, warehouseId, qtyOnHand: Math.max(0, qty) },
      update: { qtyOnHand: { increment: qty } },
    })

    // Record the movement
    const movement = await tx.stockMovement.create({
      data: { productId, warehouseId, movementType: 'adjustment', qty, note, createdById },
    })

    return { stock, movement }
  })

  res.status(201).json(result)
})

// POST /stock/receive — supplier receipt (increases stock)
router.post('/stock/receive', async (req, res) => {
  const { productId, warehouseId, zoneId, qty, referenceId, note, createdById } = req.body

  const result = await prisma.$transaction(async (tx) => {
    const stock = await tx.stock.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      create: { productId, warehouseId, zoneId, qtyOnHand: qty },
      update: { qtyOnHand: { increment: qty }, ...(zoneId && { zoneId }) },
    })

    const movement = await tx.stockMovement.create({
      data: { productId, warehouseId, movementType: 'receipt', qty, referenceId, note, createdById },
    })

    return { stock, movement }
  })

  res.status(201).json(result)
})

// ============================================================
// STOCK MOVEMENTS
// ============================================================

// GET /stock/movements
router.get('/stock/movements', async (req, res) => {
  const { page = 1, limit = 30, productId, warehouseId, movementType } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: {
        ...(productId    && { productId }),
        ...(warehouseId  && { warehouseId }),
        ...(movementType && { movementType }),
      },
      skip, take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        product:   { select: { sku: true, name: true } },
        warehouse: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.stockMovement.count(),
  ])

  res.json({ data: movements, total, page: Number(page), limit: Number(limit) })
})

// ============================================================
// WAREHOUSES
// ============================================================

// GET /warehouses
router.get('/warehouses', async (req, res) => {
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    include: { zones: true, _count: { select: { stock: true } } },
  })
  res.json(warehouses)
})

// POST /warehouses
router.post('/warehouses', async (req, res) => {
  const { name, location } = req.body
  const warehouse = await prisma.warehouse.create({ data: { name, location } })
  res.status(201).json(warehouse)
})

// POST /warehouses/:id/zones
router.post('/warehouses/:id/zones', async (req, res) => {
  const { name, description } = req.body
  const zone = await prisma.warehouseZone.create({
    data: { warehouseId: req.params.id, name, description },
  })
  res.status(201).json(zone)
})

// ============================================================
// CATEGORIES
// ============================================================

// GET /categories
router.get('/categories', async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: { children: true, _count: { select: { products: true } } },
  })
  res.json(categories)
})

// POST /categories
router.post('/categories', async (req, res) => {
  const { name, parentId } = req.body
  const category = await prisma.category.create({ data: { name, parentId } })
  res.status(201).json(category)
})

export default router
