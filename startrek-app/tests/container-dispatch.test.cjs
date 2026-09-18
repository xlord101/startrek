// Run with: node --require tsx/cjs --test tests/container-dispatch.test.cjs
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

let role, status, deadline, writes, createdArgs, items, stock;
const prisma = {
  containerDispatch: {
    create: async (args) => {
      createdArgs = args;
      writes++;
      return { ...args.data, id: 'created-container', items: args.data.items.create };
    },
    findUnique: async () => ({ id: 'container-test', status, pluginReadyAt: deadline, items }),
    updateMany: async () => {
      if (status !== 'READY_TO_DISPATCH' && !(status === 'PLUGIN_COOLING' && deadline && deadline.getTime() <= Date.now())) return { count: 0 };
      status = 'DISPATCHED'; writes++; return { count: 1 };
    },
    update: async ({ data }) => { writes++; return { id: 'container-test', ...data }; },
  },
  coldRoomAllocation: {
    findMany: async ({ where }) => stock.filter(a => a.brandName === where.brandName && a.boxType === where.boxType && a.boxCount > 0),
    updateMany: async ({ where, data }) => {
      const row = stock.find(a => a.id === where.id && a.boxCount >= where.boxCount.gte);
      if (!row) return { count: 0 };
      row.boxCount -= data.boxCount.decrement;
      row.shippedBoxes += data.shippedBoxes.increment;
      return { count: 1 };
    },
  },
  $transaction: async (callback) => {
    const snapshot = structuredClone({ stock, status, writes });
    try { return await callback(prisma); }
    catch (error) { ({ stock, status, writes } = snapshot); throw error; }
  },
};
// Intercept only the route's infrastructure dependencies; execute its real handlers.
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'next/headers') return { cookies: async () => ({ get: () => ({ value: 'test-token' }) }) };
  if (request === '@/lib/auth') return { verifyToken: async () => ({ role, userId: 'test-user' }) };
  if (request === '@/lib/prisma') return { prisma };
  return originalLoad.call(this, request, parent, isMain);
};
const route = require(path.resolve(__dirname, '../src/app/api/container-dispatch/route.ts'));
after(() => { Module._load = originalLoad; });
beforeEach(() => {
  role = 'COLD_STORAGE_ADMIN'; status = 'LOADED'; deadline = null; writes = 0;
  items = []; stock = []; createdArgs = undefined;
});
const request = (body) => new Request('http://localhost/api/container-dispatch', {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dispatchId: 'container-test', ...body }),
});

test('loaded container requires admin approval before physical dispatch', async () => {
  const response = await route.PUT(request({}));
  assert.equal(response.status, 400);
  assert.equal(writes, 0);
});
test('cold storage cannot grant its own direct-dispatch permission', async () => {
  const response = await route.PATCH(request({ action: 'ALLOW_DISPATCH' }));
  assert.equal(response.status, 403);
  assert.equal(writes, 0);
});
test('cold storage cannot start cooling in place of admin approval', async () => {
  const response = await route.PATCH(request({ action: 'PLUG_IN', pluginHours: 2 }));
  assert.equal(response.status, 403);
  assert.equal(writes, 0);
});
test('office admin can approve a loaded container', async () => {
  role = 'OFFICE_ADMIN';
  const response = await route.PATCH(request({ action: 'ALLOW_DISPATCH' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).dispatch.status, 'READY_TO_DISPATCH');
});
test('cooling is blocked before its deadline', async () => {
  status = 'PLUGIN_COOLING'; deadline = new Date(Date.now() + 3600000);
  assert.equal((await route.PUT(request({}))).status, 400);
  assert.equal(writes, 0);
});
test('cooling with a missing deadline fails closed', async () => {
  status = 'PLUGIN_COOLING';
  assert.equal((await route.PUT(request({}))).status, 400);
  assert.equal(writes, 0);
});
test('cooling permits dispatch exactly at the deadline', async () => {
  const originalNow = Date.now;
  Date.now = () => 1800000000000;
  try {
    status = 'PLUGIN_COOLING'; deadline = new Date(Date.now());
    const response = await route.PUT(request({}));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).dispatch.status, 'DISPATCHED');
  } finally { Date.now = originalNow; }
});
test('approved container permits physical dispatch', async () => {
  status = 'READY_TO_DISPATCH';
  assert.equal((await route.PUT(request({}))).status, 200);
});
test('already dispatched container cannot dispatch twice sequentially', async () => {
  status = 'DISPATCHED';
  assert.equal((await route.PUT(request({}))).status, 400);
  assert.equal(writes, 0);
});

const allocation = (id, boxType, boxCount) => ({ id, brandName: 'Star', boxType, boxCount, shippedBoxes: 0 });
test('dispatch consumes matching brand AND size, excluding legacy unknown size', async () => {
  status = 'READY_TO_DISPATCH';
  items = [{ brandName: 'Star', boxType: 'BOX_13KG', quantity: 15 }];
  stock = [allocation('other', 'BOX_5KG', 100), allocation('legacy', null, 100), allocation('first', 'BOX_13KG', 10), allocation('second', 'BOX_13KG', 20)];
  assert.equal((await route.PUT(request({}))).status, 200);
  assert.deepEqual(stock.map(a => a.boxCount), [100, 100, 0, 15]);
  assert.deepEqual(stock.map(a => a.shippedBoxes), [0, 0, 10, 5]);
});
test('insufficient later load line rolls back all stock and dispatch state', async () => {
  status = 'READY_TO_DISPATCH';
  items = [{ brandName: 'Star', boxType: 'BOX_13KG', quantity: 10 }, { brandName: 'Star', boxType: 'BOX_5KG', quantity: 50 }];
  stock = [allocation('first', 'BOX_13KG', 20), allocation('second', 'BOX_5KG', 10)];
  const before = structuredClone(stock);
  const response = await route.PUT(request({}));
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /INSUFFICIENT_STOCK/);
  assert.deepEqual(stock, before);
  assert.equal(status, 'READY_TO_DISPATCH');
  assert.equal(writes, 0);
});
test('repeated size lines cannot overdraw the same stock', async () => {
  status = 'READY_TO_DISPATCH';
  items = Array.from({ length: 2 }, () => ({ brandName: 'Star', boxType: 'BOX_13KG', quantity: 15 }));
  stock = [allocation('first', 'BOX_13KG', 20)];
  assert.equal((await route.PUT(request({}))).status, 409);
  assert.equal(stock[0].boxCount, 20);
});
test('admin creates multi-brand load request with persisted item quantities', async () => {
  role = 'MAIN_ADMIN';
  const lines = [{ boxType: 'BOX_13KG', brandName: 'Star', quantity: 100 }, { boxType: 'BOX_5KG', brandName: 'Other', quantity: 50 }];
  const response = await route.POST(new Request('http://localhost/api/container-dispatch', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ containerNo: ' TEST-001 ', sealNumber: ' SEAL ', vehicleNo: ' TRUCK ', mobMobile: ' 0000000000 ', items: lines }),
  }));
  assert.equal(response.status, 200);
  assert.equal(createdArgs.data.containerNo, 'TEST-001');
  assert.equal(createdArgs.data.status, 'PENDING_LOADING');
  assert.equal(createdArgs.data.createdById, 'test-user');
  assert.deepEqual(createdArgs.data.items.create, lines);
  assert.deepEqual((await response.json()).dispatch.items, lines);
});
