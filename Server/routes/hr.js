// src/routes/hr.js
// HR & Payroll — Employees, Departments, Payroll Runs

import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// ============================================================
// DEPARTMENTS
// ============================================================

// GET /departments
router.get('/departments', async (req, res) => {
  const departments = await prisma.department.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { name: 'asc' },
  })
  res.json(departments)
})

// POST /departments
router.post('/departments', async (req, res) => {
  const department = await prisma.department.create({ data: { name: req.body.name } })
  res.status(201).json(department)
})

// ============================================================
// EMPLOYEES
// ============================================================

// GET /employees
router.get('/employees', async (req, res) => {
  const { page = 1, limit = 20, status, departmentId, employmentType, search } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where = {
    ...(status         && { status }),
    ...(employmentType && { employmentType }),
    ...(departmentId   && { departmentId: Number(departmentId) }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
        { role:      { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where, skip, take: Number(limit),
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { department: { select: { name: true } } },
    }),
    prisma.employee.count({ where }),
  ])

  res.json({ data: employees, total, page: Number(page), limit: Number(limit) })
})

// GET /employees/:id
router.get('/employees/:id', async (req, res) => {
  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      department: true,
      payrollEntries: {
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { payrollRun: { select: { periodFrom: true, periodTo: true } } },
      },
    },
  })
  res.json(employee)
})

// POST /employees
router.post('/employees', async (req, res) => {
  const {
    firstName, lastName, email, phone,
    role, departmentId, employmentType,
    startDate, baseSalary,
  } = req.body

  const employee = await prisma.employee.create({
    data: {
      firstName, lastName, email, phone,
      role, departmentId, employmentType,
      startDate: new Date(startDate),
      baseSalary,
    },
  })
  res.status(201).json(employee)
})

// PATCH /employees/:id
router.patch('/employees/:id', async (req, res) => {
  const {
    firstName, lastName, email, phone,
    role, departmentId, employmentType,
    status, startDate, endDate, baseSalary,
  } = req.body

  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      firstName, lastName, email, phone,
      role, departmentId, employmentType, status,
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate   && { endDate:   new Date(endDate)   }),
      baseSalary,
    },
  })
  res.json(employee)
})

// DELETE /employees/:id  (soft delete — sets status to terminated)
router.delete('/employees/:id', async (req, res) => {
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: { status: 'terminated', endDate: new Date() },
  })
  res.json(employee)
})

// ============================================================
// PAYROLL RUNS
// ============================================================

// GET /payroll/runs
router.get('/payroll/runs', async (req, res) => {
  const runs = await prisma.payrollRun.findMany({
    orderBy: { runDate: 'desc' },
    include: { _count: { select: { entries: true } } },
  })
  res.json(runs)
})

// GET /payroll/runs/:id — run detail with all entries
router.get('/payroll/runs/:id', async (req, res) => {
  const run = await prisma.payrollRun.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      entries: {
        include: {
          employee: {
            select: { firstName: true, lastName: true, role: true, employmentType: true },
          },
        },
        orderBy: [{ employee: { lastName: 'asc' } }],
      },
    },
  })
  res.json(run)
})

// POST /payroll/runs — create a new payroll run for all active employees
router.post('/payroll/runs', async (req, res) => {
  const { periodFrom, periodTo } = req.body
  // hoursData: [{ employeeId, hoursWorked, bonuses, deductions }] — optional overrides
  const { hoursData = [] } = req.body

  const run = await prisma.$transaction(async (tx) => {
    // Get all active employees
    const employees = await tx.employee.findMany({
      where: { status: 'active' },
    })

    const hoursMap = Object.fromEntries(hoursData.map(h => [h.employeeId, h]))

    // Create the run
    const payrollRun = await tx.payrollRun.create({
      data: {
        periodFrom: new Date(periodFrom),
        periodTo:   new Date(periodTo),
      },
    })

    // Create entries for each employee
    const entries = await Promise.all(
      employees.map(emp => {
        const override   = hoursMap[emp.id] || {}
        const basePay    = Number(emp.baseSalary)
        const deductions = Number(override.deductions ?? basePay * 0.1) // 10% default deduction
        const bonuses    = Number(override.bonuses    ?? 0)
        const netPay     = basePay - deductions + bonuses

        return tx.payrollEntry.create({
          data: {
            payrollRunId: payrollRun.id,
            employeeId:   emp.id,
            hoursWorked:  override.hoursWorked ?? null,
            basePay,
            deductions,
            bonuses,
            netPay,
            status: 'pending',
          },
        })
      })
    )

    return { ...payrollRun, entries }
  })

  res.status(201).json(run)
})

// PATCH /payroll/runs/:runId/entries/:entryId — update a single entry
router.patch('/payroll/runs/:runId/entries/:entryId', async (req, res) => {
  const { hoursWorked, basePay, deductions, bonuses, status } = req.body
  const netPay = Number(basePay) - Number(deductions) + Number(bonuses)

  const entry = await prisma.payrollEntry.update({
    where: { id: req.params.entryId },
    data: { hoursWorked, basePay, deductions, bonuses, netPay, status },
  })
  res.json(entry)
})

// POST /payroll/runs/:id/process — mark all pending entries as processed
router.post('/payroll/runs/:id/process', async (req, res) => {
  const updated = await prisma.payrollEntry.updateMany({
    where: { payrollRunId: req.params.id, status: 'pending' },
    data: { status: 'processed' },
  })
  res.json({ processed: updated.count })
})

// GET /payroll/summary — total payroll cost by department
router.get('/payroll/summary', async (req, res) => {
  const summary = await prisma.payrollEntry.groupBy({
    by: ['employeeId'],
    _sum: { netPay: true },
    where: { status: 'processed' },
  })
  res.json(summary)
})

export default router
