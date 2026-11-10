// Run with: npx tsx tests/export-orders.test.cjs
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

let role = 'MAIN_ADMIN';
let tokenVal = 'valid-token';
let ordersInDb = [];
let writes = 0;

const prisma = {
  exportOrder: {
    findMany: async () => structuredClone(ordersInDb),
    findUnique: async ({ where }) => ordersInDb.find((o) => o.id === where.id) || null,
    count: async () => ordersInDb.length,
    create: async ({ data, include }) => {
      writes++;
      const id = `order-${Date.now()}`;
      const newOrder = {
        id,
        orderNumber: data.orderNumber,
        buyerName: data.buyerName,
        destination: data.destination,
        targetDate: data.targetDate,
        remarks: data.remarks,
        containerCapacity: data.containerCapacity,
        status: data.status,
        createdById: data.createdById,
        items: data.items.create.map((it, idx) => ({ id: `item-${idx}`, orderId: id, ...it })),
        dispatches: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      ordersInDb.push(newOrder);
      return newOrder;
    },
    update: async ({ where, data }) => {
      writes++;
      const existing = ordersInDb.find((o) => o.id === where.id);
      if (!existing) throw new Error('Not found');
      Object.assign(existing, data);
      return existing;
    },
    delete: async ({ where }) => {
      writes++;
      const idx = ordersInDb.findIndex((o) => o.id === where.id);
      if (idx !== -1) ordersInDb.splice(idx, 1);
      return { id: where.id };
    },
  },
  user: {
    findMany: async () => [{ id: 'admin-1' }],
  },
  notification: {
    create: async () => ({ id: 'notif-1' }),
  },
};

// Mock Next.js & project dependencies
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'next/headers') {
    return {
      cookies: async () => ({
        get: (name) => (name === 'auth_token' && tokenVal ? { value: tokenVal } : undefined),
      }),
    };
  }
  if (request === '@/lib/auth') {
    return {
      verifyToken: async (t) => (t === 'valid-token' ? { role, userId: 'user-1' } : null),
    };
  }
  if (request === '@/lib/prisma') return { prisma };
  if (request === '@/lib/notifications') return { createNotification: async () => {} };
  return originalLoad.call(this, request, parent, isMain);
};

const route = require(path.resolve(__dirname, '../src/app/api/orders/route.ts'));
after(() => {
  Module._load = originalLoad;
});

beforeEach(() => {
  role = 'MAIN_ADMIN';
  tokenVal = 'valid-token';
  writes = 0;
  ordersInDb = [
    {
      id: 'ord-1',
      orderNumber: 'ORD-2026-001',
      buyerName: 'Dubai Fruits LLC',
      destination: 'Jebel Ali',
      status: 'IN_PROGRESS',
      containerCapacity: 1500,
      items: [{ id: 'it-1', boxType: 'BOX_13KG', brandName: 'Joy Banana', quantity: 1500 }],
      dispatches: [
        {
          id: 'disp-1',
          status: 'DISPATCHED',
          items: [{ boxType: 'BOX_13KG', brandName: 'Joy Banana', quantity: 1500 }],
        },
      ],
      createdAt: new Date(),
    },
  ];
});

// Tests
test('GET /api/orders returns 401 when unauthenticated', async () => {
  tokenVal = null;
  const res = await route.GET();
  assert.equal(res.status, 401);
});

test('GET /api/orders returns 403 when role is unauthorized', async () => {
  role = 'FIELD_SUPERVISOR';
  const res = await route.GET();
  assert.equal(res.status, 403);
});

test('GET /api/orders returns orders list and auto-marks fully dispatched order as COMPLETED', async () => {
  role = 'COLD_STORAGE_ADMIN';
  const res = await route.GET();
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.orders.length, 1);
  assert.equal(data.orders[0].status, 'COMPLETED');
});

test('POST /api/orders rejects missing buyer name with 400', async () => {
  const req = new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyerName: '', items: [{ boxType: '13KG', brandName: 'Star', quantity: 100 }] }),
  });
  const res = await route.POST(req);
  assert.equal(res.status, 400);
});

test('POST /api/orders rejects empty items list with 400', async () => {
  const req = new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyerName: 'Al-Farooq', items: [] }),
  });
  const res = await route.POST(req);
  assert.equal(res.status, 400);
});

test('POST /api/orders rejects unauthorized role with 403', async () => {
  role = 'PROCUREMENT_SUPERVISOR';
  const req = new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyerName: 'Al-Farooq', items: [{ boxType: '13KG', brandName: 'Star', quantity: 500 }] }),
  });
  const res = await route.POST(req);
  assert.equal(res.status, 403);
});

test('POST /api/orders creates order with generated orderNumber and item lines', async () => {
  role = 'MAIN_ADMIN';
  const req = new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyerName: 'Al-Madina Fresh Dubai',
      destination: 'Jebel Ali Port',
      containerCapacity: 1540,
      items: [
        { boxType: '13KG', brandName: 'Joy Banana', quantity: 1540 },
        { boxType: '7KG', brandName: 'Star', quantity: 200 },
      ],
    }),
  });
  const res = await route.POST(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.order.orderNumber.startsWith('ORD-'));
  assert.equal(data.order.buyerName, 'Al-Madina Fresh Dubai');
  assert.equal(data.order.items.length, 2);
  assert.equal(data.order.containerCapacity, 1540);
  assert.equal(writes, 1);
});

test('PATCH /api/orders updates order fields successfully', async () => {
  role = 'OFFICE_ADMIN';
  const req = new Request('http://localhost/api/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: 'ord-1',
      destination: 'Dammam Port, Saudi Arabia',
      remarks: 'Urgent harvest delivery',
    }),
  });
  const res = await route.PATCH(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.order.destination, 'Dammam Port, Saudi Arabia');
  assert.equal(data.order.remarks, 'Urgent harvest delivery');
});

test('PATCH /api/orders returns 404 for nonexistent order', async () => {
  role = 'OFFICE_ADMIN';
  const req = new Request('http://localhost/api/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: 'non-existent-id', destination: 'Nowhere' }),
  });
  const res = await route.PATCH(req);
  assert.equal(res.status, 404);
});

test('DELETE /api/orders rejects unauthorized roles with 403', async () => {
  role = 'FIELD_SUPERVISOR';
  const req = new Request('http://localhost/api/orders?id=ord-1', { method: 'DELETE' });
  const res = await route.DELETE(req);
  assert.equal(res.status, 403);
});

test('DELETE /api/orders deletes order successfully', async () => {
  role = 'MAIN_ADMIN';
  const req = new Request('http://localhost/api/orders?id=ord-1', { method: 'DELETE' });
  const res = await route.DELETE(req);
  assert.equal(res.status, 200);
  assert.equal(ordersInDb.length, 0);
});
