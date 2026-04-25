// prisma/seed.js
// Seeds the database with sample data for all three modules

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding RetailOS ERP...')

  // Countries
  await prisma.country.createMany({
    data: [
      { code: 'KE', name: 'Kenya' },
      { code: 'UG', name: 'Uganda' },
      { code: 'TZ', name: 'Tanzania' },
      { code: 'US', name: 'United States' },
    ],
    skipDuplicates: true,
  })

  // Departments
  const [salesDept, warehouseDept, mgmtDept] = await Promise.all([
    prisma.department.upsert({ where: { name: 'Sales floor' },  update: {}, create: { name: 'Sales floor' } }),
    prisma.department.upsert({ where: { name: 'Warehouse' },    update: {}, create: { name: 'Warehouse' } }),
    prisma.department.upsert({ where: { name: 'Management' },   update: {}, create: { name: 'Management' } }),
  ])

  // Employees
  const [kofi, priya, grace] = await Promise.all([
    prisma.employee.upsert({
      where: { email: 'kofi@retailos.com' }, update: {},
      create: {
        firstName: 'Kofi', lastName: 'Agyeman', email: 'kofi@retailos.com',
        role: 'Sales associate', departmentId: salesDept.id,
        employmentType: 'full_time', startDate: new Date('2023-01-15'),
        baseSalary: 2400,
      },
    }),
    prisma.employee.upsert({
      where: { email: 'priya@retailos.com' }, update: {},
      create: {
        firstName: 'Priya', lastName: 'Wambui', email: 'priya@retailos.com',
        role: 'Warehouse operator', departmentId: warehouseDept.id,
        employmentType: 'full_time', startDate: new Date('2022-03-01'),
        baseSalary: 2200,
      },
    }),
    prisma.employee.upsert({
      where: { email: 'grace@retailos.com' }, update: {},
      create: {
        firstName: 'Grace', lastName: 'Auma', email: 'grace@retailos.com',
        role: 'Store manager', departmentId: mgmtDept.id,
        employmentType: 'full_time', startDate: new Date('2020-06-01'),
        baseSalary: 4500, status: 'on_leave',
      },
    }),
  ])

  // Categories
  const [footwear, fitness, accessories] = await Promise.all([
    prisma.category.upsert({ where: { name: 'Footwear' },    update: {}, create: { name: 'Footwear' } }),
    prisma.category.upsert({ where: { name: 'Fitness' },     update: {}, create: { name: 'Fitness' } }),
    prisma.category.upsert({ where: { name: 'Accessories' }, update: {}, create: { name: 'Accessories' } }),
  ])

  // Warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' }, update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Warehouse A — Main', location: 'Eldoret, Kenya',
    },
  })

  const zone = await prisma.warehouseZone.create({
    data: { warehouseId: warehouse.id, name: 'Zone 1', description: 'Footwear & Fitness' },
  }).catch(() => null)

  // Products
  const [shoes, yogaMat, bottle] = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'SKU-001' }, update: {},
      create: {
        sku: 'SKU-001', name: 'Running shoes X2', categoryId: footwear.id,
        costPrice: 45, sellPrice: 89.99, reorderPoint: 20, reorderQty: 100,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SKU-002' }, update: {},
      create: {
        sku: 'SKU-002', name: 'Yoga mat Pro', categoryId: fitness.id,
        costPrice: 12, sellPrice: 34.99, reorderPoint: 15, reorderQty: 50,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SKU-003' }, update: {},
      create: {
        sku: 'SKU-003', name: 'Water bottle 1L', categoryId: accessories.id,
        costPrice: 4, sellPrice: 14.99, reorderPoint: 20, reorderQty: 100,
      },
    }),
  ])

  // Stock
  await Promise.all([
    prisma.stock.upsert({
      where: { productId_warehouseId: { productId: shoes.id, warehouseId: warehouse.id } },
      update: {}, create: { productId: shoes.id, warehouseId: warehouse.id, qtyOnHand: 82 },
    }),
    prisma.stock.upsert({
      where: { productId_warehouseId: { productId: yogaMat.id, warehouseId: warehouse.id } },
      update: {}, create: { productId: yogaMat.id, warehouseId: warehouse.id, qtyOnHand: 14 },
    }),
    prisma.stock.upsert({
      where: { productId_warehouseId: { productId: bottle.id, warehouseId: warehouse.id } },
      update: {}, create: { productId: bottle.id, warehouseId: warehouse.id, qtyOnHand: 5 },
    }),
  ])

  // Customers
  const amara = await prisma.customer.upsert({
    where: { email: 'amara@example.com' }, update: {},
    create: {
      firstName: 'Amara', lastName: 'Osei', email: 'amara@example.com',
      phone: '+254700000001', segment: 'vip', countryCode: 'KE',
    },
  })

  // Sample order
  await prisma.order.create({
    data: {
      customerId: amara.id, channel: 'online', status: 'fulfilled',
      subtotal: 89.99, tax: 14.40,
      items: {
        create: [{
          productId: shoes.id, sku: shoes.sku, name: shoes.name,
          qty: 1, unitPrice: 89.99,
        }],
      },
    },
  })

  // Sample payroll run
  await prisma.payrollRun.create({
    data: {
      periodFrom: new Date('2026-04-01'),
      periodTo:   new Date('2026-04-30'),
      entries: {
        create: [kofi, priya].map(emp => ({
          employeeId:  emp.id,
          basePay:     Number(emp.baseSalary),
          deductions:  Number(emp.baseSalary) * 0.1,
          bonuses:     0,
          netPay:      Number(emp.baseSalary) * 0.9,
          status:      'processed',
        })),
      },
    },
  })

  console.log('Seed complete!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
