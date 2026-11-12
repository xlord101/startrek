// Run with: node --require tsx/cjs --test tests/security-audit.test.cjs
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

let role = 'MAIN_ADMIN';
let userId = 'user-1';
let tokenVal = 'valid-token';
let dbWrites = 0;

const usersDb = [
  {
    id: 'user-2',
    name: 'Staff Member',
    email: 'staff@kdexport.com',
    role: 'FIELD_SUPERVISOR',
    isActive: true,
    createdAt: new Date(),
  },
];

const prisma = {
  $queryRaw: async () => [{ '?column?': 1 }],
  user: {
    findMany: async () => [...usersDb],
    findUnique: async ({ where }) => usersDb.find((u) => u.id === where.id || u.email === where.email) || null,
    create: async ({ data }) => {
      dbWrites++;
      return { id: 'user-new', ...data, createdAt: new Date() };
    },
    update: async ({ where, data }) => {
      dbWrites++;
      const existing = usersDb.find((u) => u.id === where.id);
      return { ...(existing || { id: where.id, name: 'Updated', email: 'x@kdexport.com', role: 'FIELD_SUPERVISOR', isActive: true, createdAt: new Date() }), ...data };
    },
    delete: async ({ where }) => {
      dbWrites++;
      return { id: where.id };
    },
  },
  session: {
    deleteMany: async () => {
      dbWrites++;
      return { count: 1 };
    },
  },
  notification: {
    deleteMany: async () => ({ count: 0 }),
  },
  harvestTask: {
    findUnique: async () => ({ id: 'h-1', supervisorId: 'user-1' }),
    update: async ({ data }) => {
      dbWrites++;
      return {
        id: 'h-1',
        selectedBoxTypes: [],
        ...data,
        farmer: { id: 'f-1', name: 'Farmer', mobileNumber: '9999999999', address: 'Village' },
        supervisor: { id: 'user-1', name: 'Sup', email: 's@kdexport.com', role: 'FIELD_SUPERVISOR' },
        vehicleSupplier: null,
      };
    },
  },
  procurementTask: {
    findUnique: async () => ({ id: 'p-1', supervisorId: 'user-1', batchNumber: null }),
    update: async ({ data }) => {
      dbWrites++;
      return {
        id: 'p-1',
        farmerId: 'f-1',
        approxTonnage: 10,
        finalRate: data.finalRate ?? null,
        supervisorRatePerKg: data.supervisorRatePerKg ?? null,
        farmer: { id: 'f-1', name: 'Farmer', mobileNumber: '9999999999', address: 'Village' },
        supervisor: { id: 'user-1', name: 'Sup', email: 's@kdexport.com', role: 'FIELD_SUPERVISOR' },
        particulars: [],
      };
    },
  },
  labourTeam: {
    create: async ({ data }) => {
      dbWrites++;
      return { id: 'lt-1', ...data };
    },
    update: async ({ where, data }) => {
      dbWrites++;
      return { id: where.id, ...data };
    },
    delete: async ({ where }) => {
      dbWrites++;
      return { id: where.id };
    },
  },
  vehicleSupplier: {
    create: async ({ data }) => {
      dbWrites++;
      return { id: 'vs-1', ...data };
    },
  },
  coldStorageReceipt: {
    update: async ({ where, data }) => {
      dbWrites++;
      return { id: where.id, ...data };
    },
  },
};

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
      verifyToken: async (t) => (t === 'valid-token' ? { role, userId, name: 'Test User', email: 'test@kdexport.com' } : null),
      hashPassword: async (p) => `hashed:${p}`,
      signToken: async () => 'fresh-token',
    };
  }
  if (request === '@/lib/prisma') return { prisma };
  if (request === '@/lib/audit') return { logAuditEvent: async () => {} };
  if (request === '@/lib/notifications') return { createNotification: async () => {} };
  if (request === '@/lib/sms') {
    return {
      DEFAULT_OFFICE_NUMBER: '+910000000000',
      formatHarvestWorkOrderSMS: () => 'sms',
      sendLabourTeamSMS: async () => ({ success: true, mode: 'SYSTEM_LOGGED', message: 'sms' }),
    };
  }
  if (request === '@/lib/consumables') {
    return {
      buildHarvestConsumableDeductions: () => ({}),
      deductConsumableStock: async () => {},
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const harvestRoute = require(path.resolve(__dirname, '../src/app/api/harvest/route.ts'));
const procurementRoute = require(path.resolve(__dirname, '../src/app/api/procurement/route.ts'));
const usersRoute = require(path.resolve(__dirname, '../src/app/api/users/route.ts'));
const userByIdRoute = require(path.resolve(__dirname, '../src/app/api/users/[id]/route.ts'));
const healthRoute = require(path.resolve(__dirname, '../src/app/api/health/route.ts'));
const labourTeamsRoute = require(path.resolve(__dirname, '../src/app/api/labour-teams/route.ts'));
const vehicleSuppliersRoute = require(path.resolve(__dirname, '../src/app/api/vehicle-suppliers/route.ts'));
const coldStorageRoute = require(path.resolve(__dirname, '../src/app/api/cold-storage/route.ts'));

after(() => {
  Module._load = originalLoad;
});

beforeEach(() => {
  role = 'MAIN_ADMIN';
  userId = 'user-1';
  tokenVal = 'valid-token';
  dbWrites = 0;
});

test('PATCH /api/harvest blocks SCHEDULE_HARVEST for supervisors and rejects arbitrary mass assignment', async () => {
  role = 'FIELD_SUPERVISOR';
  const scheduleRes = await harvestRoute.PATCH(new Request('http://test/api/harvest', {
    method: 'PATCH',
    body: JSON.stringify({ taskId: 'h-1', action: 'SCHEDULE_HARVEST', supervisorId: 'user-2' }),
  }));
  assert.equal(scheduleRes.status, 403);
  assert.equal(dbWrites, 0);

  const massAssignRes = await harvestRoute.PATCH(new Request('http://test/api/harvest', {
    method: 'PATCH',
    body: JSON.stringify({ taskId: 'h-1', action: 'ARBITRARY_OVERWRITE', finalRate: 999 }),
  }));
  assert.equal(massAssignRes.status, 400);
  assert.equal(dbWrites, 0);

  const workStartedRes = await harvestRoute.PATCH(new Request('http://test/api/harvest', {
    method: 'PATCH',
    body: JSON.stringify({ taskId: 'h-1', action: 'WORK_STARTED', qualityCheck: 'GOOD' }),
  }));
  assert.equal(workStartedRes.status, 200);
  assert.equal(dbWrites, 1);
});

test('PATCH /api/procurement prevents assigned supervisor from self-approving rate or status', async () => {
  role = 'PROCUREMENT_SUPERVISOR';
  const res = await procurementRoute.PATCH(new Request('http://test/api/procurement', {
    method: 'PATCH',
    body: JSON.stringify({ taskId: 'p-1', status: 'APPROVED_PROCUREMENT', finalRatePerKg: 50 }),
  }));
  assert.equal(res.status, 403);
  assert.equal(dbWrites, 0);

  const submitRes = await procurementRoute.PATCH(new Request('http://test/api/procurement', {
    method: 'PATCH',
    body: JSON.stringify({ taskId: 'p-1', status: 'FIELD_SUBMITTED', quality: 'GOOD' }),
  }));
  assert.equal(submitRes.status, 200);
  assert.equal(dbWrites, 1);
});

test('/api/users* mutations are restricted strictly to MAIN_ADMIN and validate password/role', async () => {
  role = 'OFFICE_ADMIN';
  const createRes = await usersRoute.POST(new Request('http://test/api/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'X', email: 'x@kdexport.com', password: 'secret123', role: 'MAIN_ADMIN' }),
  }));
  assert.equal(createRes.status, 403);

  const patchRes = await userByIdRoute.PATCH(
    new Request('http://test/api/users/user-2', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'MAIN_ADMIN' }),
    }),
    { params: Promise.resolve({ id: 'user-2' }) }
  );
  assert.equal(patchRes.status, 403);

  const delRes = await userByIdRoute.DELETE(
    new Request('http://test/api/users/user-2', { method: 'DELETE' }),
    { params: Promise.resolve({ id: 'user-2' }) }
  );
  assert.equal(delRes.status, 403);
  assert.equal(dbWrites, 0);

  role = 'MAIN_ADMIN';
  const badPwd = await usersRoute.POST(new Request('http://test/api/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'X', email: 'new@kdexport.com', password: '123', role: 'FIELD_SUPERVISOR' }),
  }));
  assert.equal(badPwd.status, 400);

  const badRole = await usersRoute.POST(new Request('http://test/api/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'X', email: 'new@kdexport.com', password: 'password123', role: 'SUPER_GOD' }),
  }));
  assert.equal(badRole.status, 400);
});

test('GET /api/health confirms readiness without leaking userCount', async () => {
  const res = await healthRoute.GET();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'healthy');
  assert.equal(body.userCount, undefined);
});

test('/api/labour-teams, /api/vehicle-suppliers, and /api/cold-storage enforce RBAC', async () => {
  role = 'FIELD_SUPERVISOR';
  const ltRes = await labourTeamsRoute.POST(new Request('http://test/api/labour-teams', {
    method: 'POST',
    body: JSON.stringify({ teamName: 'Team X', contactNumber: '9999999999' }),
  }));
  assert.equal(ltRes.status, 403);

  const vsRes = await vehicleSuppliersRoute.POST(new Request('http://test/api/vehicle-suppliers', {
    method: 'POST',
    body: JSON.stringify({ supplierName: 'Sup', vehicleNumber: 'MH12AB1234' }),
  }));
  assert.equal(vsRes.status, 403);

  role = 'INVENTORY_ADMIN';
  const csRes = await coldStorageRoute.PATCH(new Request('http://test/api/cold-storage', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'VERIFY', receiptId: 'r-1', verifiedBoxCount: 100 }),
  }));
  assert.equal(csRes.status, 403);
  assert.equal(dbWrites, 0);
});

