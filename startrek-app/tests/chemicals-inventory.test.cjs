// Run with: node --require tsx/cjs --test tests/chemicals-inventory.test.cjs
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

let role = 'INVENTORY_ADMIN';
let tokenVal = 'valid-token';
let consumablesDb = [];
let harvestTasksDb = [];
let inventoryStockDb = [];
let boxBrandStockDb = [];

function applyUpdateOp(current, op) {
  if (op && typeof op === 'object') {
    if (op.increment !== undefined) return (current || 0) + op.increment;
    if (op.decrement !== undefined) return (current || 0) - op.decrement;
  }
  return op;
}

const prisma = {
  consumableInventoryStock: {
    findMany: async ({ where } = {}) => {
      if (where?.itemType?.in) {
        return consumablesDb.filter((r) => where.itemType.in.includes(r.itemType)).map((r) => ({ ...r }));
      }
      return consumablesDb.map((r) => ({ ...r }));
    },
    findUnique: async ({ where }) => {
      const found = consumablesDb.find((r) => r.itemType === where.itemType);
      return found ? { ...found } : null;
    },
    create: async ({ data }) => {
      const row = { id: `c-${consumablesDb.length + 1}`, issuedStock: 0, availableStock: 0, unit: 'units', ...data };
      consumablesDb.push(row);
      return { ...row };
    },
    update: async ({ where, data }) => {
      const idx = consumablesDb.findIndex((r) => (where.id ? r.id === where.id : r.itemType === where.itemType));
      if (idx === -1) throw new Error(`Consumable ${JSON.stringify(where)} not found`);
      const next = { ...consumablesDb[idx] };
      if (data.availableStock !== undefined) next.availableStock = applyUpdateOp(next.availableStock, data.availableStock);
      if (data.issuedStock !== undefined) next.issuedStock = applyUpdateOp(next.issuedStock, data.issuedStock);
      if (data.unit !== undefined) next.unit = data.unit;
      consumablesDb[idx] = next;
      return { ...next };
    },
    upsert: async ({ where, update, create }) => {
      const idx = consumablesDb.findIndex((r) => r.itemType === where.itemType);
      if (idx === -1) {
        const row = { id: `c-${consumablesDb.length + 1}`, issuedStock: 0, availableStock: 0, unit: 'units', ...create };
        consumablesDb.push(row);
        return { ...row };
      }
      const next = { ...consumablesDb[idx] };
      if (update.availableStock !== undefined) next.availableStock = applyUpdateOp(next.availableStock, update.availableStock);
      if (update.issuedStock !== undefined) next.issuedStock = applyUpdateOp(next.issuedStock, update.issuedStock);
      if (update.unit !== undefined) next.unit = update.unit;
      consumablesDb[idx] = next;
      return { ...next };
    },
    updateMany: async ({ where, data }) => {
      let count = 0;
      for (let i = 0; i < consumablesDb.length; i++) {
        if (consumablesDb[i].itemType === where.itemType) {
          if (data.availableStock !== undefined) {
            consumablesDb[i].availableStock = applyUpdateOp(consumablesDb[i].availableStock, data.availableStock);
          }
          if (data.issuedStock !== undefined) {
            consumablesDb[i].issuedStock = applyUpdateOp(consumablesDb[i].issuedStock, data.issuedStock);
          }
          count++;
        }
      }
      return { count };
    },
    delete: async ({ where }) => {
      const idx = consumablesDb.findIndex((r) => (where.id ? r.id === where.id : r.itemType === where.itemType));
      if (idx !== -1) consumablesDb.splice(idx, 1);
      return {};
    },
    deleteMany: async ({ where }) => {
      const keys = where?.itemType?.in || (where?.itemType ? [where.itemType] : []);
      const before = consumablesDb.length;
      consumablesDb = consumablesDb.filter((r) => !keys.includes(r.itemType));
      return { count: before - consumablesDb.length };
    },
  },
  inventoryStock: {
    findMany: async () => inventoryStockDb.map((r) => ({ ...r })),
    updateMany: async () => ({ count: 0 }),
  },
  inventoryReturnRequest: { findMany: async () => [] },
  boxBrand: {
    findMany: async () => [],
    findUnique: async ({ where }) => ({ id: `brand-${where.name}`, name: where.name }),
  },
  boxBrandStock: {
    findMany: async () => [],
    findUnique: async ({ where }) =>
      boxBrandStockDb.find((r) => r.brandId === where.brandId_boxType.brandId && r.boxType === where.brandId_boxType.boxType) || null,
    update: async ({ where, data }) => {
      const row = boxBrandStockDb.find((r) => r.brandId === where.brandId_boxType.brandId && r.boxType === where.brandId_boxType.boxType);
      if (row) {
        row.availableStock = applyUpdateOp(row.availableStock, data.availableStock);
        row.issuedStock = applyUpdateOp(row.issuedStock, data.issuedStock);
      }
      return row;
    },
  },
  harvestTask: {
    findMany: async () => [],
    findUnique: async ({ where }) => harvestTasksDb.find((t) => t.id === where.id) || null,
    update: async ({ where, data }) => {
      const idx = harvestTasksDb.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error('Task not found');
      harvestTasksDb[idx] = { ...harvestTasksDb[idx], ...data };
      return harvestTasksDb[idx];
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
      verifyToken: async (t) => (t === 'valid-token' ? { role, userId: 'user-1' } : null),
    };
  }
  if (request === '@/lib/prisma') return { prisma };
  return originalLoad.call(this, request, parent, isMain);
};

after(() => {
  Module._load = originalLoad;
});

const chemicals = require(path.resolve(__dirname, '../src/lib/chemicals.ts'));
const consumables = require(path.resolve(__dirname, '../src/lib/consumables.ts'));
const inventoryRoute = require(path.resolve(__dirname, '../src/app/api/inventory/route.ts'));

beforeEach(() => {
  role = 'INVENTORY_ADMIN';
  tokenVal = 'valid-token';
  consumablesDb = [
    { id: 'c-bav', itemType: 'BAVISTIN', availableStock: 10, issuedStock: 0, unit: 'Kg' },
    { id: 'c-tilt', itemType: 'TILT', availableStock: 8, issuedStock: 0, unit: 'Liters' },
    { id: 'c-paper', itemType: 'GERM_ETHYLENE_PAPER', availableStock: 700, issuedStock: 0, unit: 'sheets' },
    { id: 'c-foam', itemType: 'FOAM_PADS', availableStock: 300, issuedStock: 0, unit: 'units' },
    { id: 'c-bag7', itemType: 'BAGS_7KG', availableStock: 50, issuedStock: 0, unit: 'kg' },
    { id: 'c-bag13', itemType: 'BAGS_13KG', availableStock: 50, issuedStock: 0, unit: 'kg' },
  ];
  harvestTasksDb = [];
  inventoryStockDb = [];
  boxBrandStockDb = [];
});

test('chemical conversions handle kg/gm and L/ml accurately and format in L / kg only', () => {
  assert.equal(chemicals.convertChemicalToBase('BAVISTIN', 1.5, 'kg'), 1500);
  assert.equal(chemicals.convertChemicalToBase('C_CHEMICAL', 250, 'gm'), 250);
  assert.equal(chemicals.convertChemicalToBase('C_CHEMICAL', 0.5, 'kg'), 500);
  assert.equal(chemicals.convertChemicalToBase('TILT', 2.5, 'L'), 2500);
  assert.equal(chemicals.convertChemicalToBase('TILT', 200, 'ml'), 200);

  assert.equal(chemicals.parseChemicalUsageToBase('C_CHEMICAL', '0.05 kg'), 50);
  assert.equal(chemicals.parseChemicalUsageToBase('TURTI', '2 kg'), 2000);
  assert.equal(chemicals.parseChemicalUsageToBase('TILT', '0.2 L'), 200);
  assert.equal(chemicals.parseChemicalUsageToBase('BAVISTIN', '1 kg'), 1000);

  // Formatting strictly in L or kg (no gm or ml displayed)
  assert.equal(chemicals.formatChemicalStock('BAVISTIN', 9950), '9.95 kg');
  assert.equal(chemicals.formatChemicalStock('TILT', 7800), '7.8 L');
  assert.equal(chemicals.formatChemicalUsageLabel('C_CHEMICAL', 50), '0.05 kg');
  assert.equal(chemicals.formatChemicalUsageLabel('TURTI', 2000), '2 kg');
  assert.equal(chemicals.formatChemicalUsageLabel('TILT', 200), '0.2 L');
  assert.equal(chemicals.formatChemicalUsageLabel('BAVISTIN', 1000), '1 kg');
});

test('ensureFixedChemicals seeds missing chemicals and idempotently upgrades legacy Kg/Liters units', async () => {
  await consumables.ensureFixedChemicals(prisma);
  const byType = new Map(consumablesDb.map((r) => [r.itemType, r]));

  assert.equal(byType.get('BAVISTIN').availableStock, 10000);
  assert.equal(byType.get('BAVISTIN').unit, 'gm');
  assert.equal(byType.get('TILT').availableStock, 8000);
  assert.equal(byType.get('TILT').unit, 'ml');
  assert.equal(byType.get('C_CHEMICAL').availableStock, 0);
  assert.equal(byType.get('C_CHEMICAL').unit, 'gm');
  assert.equal(byType.get('TURTI').availableStock, 0);
  assert.equal(byType.get('TURTI').unit, 'gm');

  // Calling a second time must NOT re-multiply!
  await consumables.ensureFixedChemicals(prisma);
  const byType2 = new Map(consumablesDb.map((r) => [r.itemType, r]));
  assert.equal(byType2.get('BAVISTIN').availableStock, 10000);
  assert.equal(byType2.get('TILT').availableStock, 8000);
});

test('harvest dispatch deducts fixed chemicals in gm/ml and all packing consumables with split bags and sheet paper', async () => {
  // Add 5 kg C_CHEMICAL and 4 kg TURTI first
  await consumables.ensureFixedChemicals(prisma);
  const cRow = consumablesDb.find((r) => r.itemType === 'C_CHEMICAL');
  const tRow = consumablesDb.find((r) => r.itemType === 'TURTI');
  cRow.availableStock = 5000;
  tRow.availableStock = 4000;

  const deductions = consumables.buildHarvestConsumableDeductions({
    requiredBoxCounts: { '7KG': 550 },
    targetRequiredBoxes: 550,
    favilocPackets: 5,
    rubberPackets: 1,
    germEthylenePaperSheets: 700,
    bagsKg7: 15.71,
    bagsKg13: 0,
    foamUnit: 1,
    hasChemicalTreatment: true,
    chemicals: ['C_CHEMICAL', 'TURTI', 'TILT', 'BAVISTIN'],
    chemicalQuantities: {
      C_CHEMICAL: '0.05 kg',
      TURTI: '2 kg',
      TILT: '0.2 L',
      BAVISTIN: '1 kg',
    },
  });

  await consumables.deductConsumableStock(prisma, deductions);

  const byType = new Map(consumablesDb.map((r) => [r.itemType, r]));
  // Chemicals deducted accurately in base units
  assert.equal(byType.get('C_CHEMICAL').availableStock, 4950);
  assert.equal(byType.get('C_CHEMICAL').issuedStock, 50);
  assert.equal(byType.get('TURTI').availableStock, 2000);
  assert.equal(byType.get('TURTI').issuedStock, 2000);
  assert.equal(byType.get('TILT').availableStock, 7800);
  assert.equal(byType.get('TILT').issuedStock, 200);
  assert.equal(byType.get('BAVISTIN').availableStock, 9000);
  assert.equal(byType.get('BAVISTIN').issuedStock, 1000);

  // Packing consumables matched existing DB rows cleanly
  assert.equal(byType.get('GERM_ETHYLENE_PAPER').availableStock, 0);
  assert.equal(byType.get('GERM_ETHYLENE_PAPER').issuedStock, 700);
  assert.equal(byType.get('GERM_ETHYLENE_PAPER').unit, 'sheets');
  assert.equal(byType.get('FOAM_PADS').availableStock, 299);
  assert.equal(byType.get('FOAM_PADS').issuedStock, 1);
  assert.equal(byType.get('BAGS_7KG').availableStock, 34.29);
  assert.equal(byType.get('BAGS_7KG').issuedStock, 15.71);
  assert.equal(byType.get('BAGS_7KG').unit, 'kg');
  assert.equal(byType.get('TOP_BUNDLE').issuedStock, 22);
  assert.equal(byType.get('BOTTOM_BUNDLE').issuedStock, 28);
  assert.equal(byType.get('FAVILOC').issuedStock, 5);
  assert.equal(byType.get('RUBBER').issuedStock, 1);

  // No duplicate CONSUMABLE_* rows created
  assert.equal(consumablesDb.some((r) => r.itemType.startsWith('CONSUMABLE_')), false);
});

test('harvest dispatch without chemical treatment deducts 0 chemicals', () => {
  const deductions = consumables.buildHarvestConsumableDeductions({
    requiredBoxCounts: { '7KG': 100 },
    targetRequiredBoxes: 100,
    hasChemicalTreatment: false,
    chemicals: ['C_CHEMICAL', 'TILT'],
  });
  assert.equal(deductions.some((d) => chemicals.isChemicalItem(d.itemType)), false);
});

test('PATCH /api/inventory ADD_STOCK & REMOVE_STOCK convert kg/L accurately and block fixed chemical deletion', async () => {
  // 1. Add 1.5 kg Bavistin -> +1500 gm on top of upgraded 10000 gm = 11500 gm
  const addRes = await inventoryRoute.PATCH(new Request('http://localhost/api/inventory', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'ADD_STOCK', boxType: 'CONSUMABLE_BAVISTIN', quantity: 1.5, unit: 'kg' }),
  }));
  assert.equal(addRes.status, 200);
  const addJson = await addRes.json();
  assert.equal(addJson.consumableStock.availableStock, 11500);
  assert.equal(addJson.consumableStock.unit, 'gm');

  // 2. Add 0.5 L Tilt -> +500 ml on top of upgraded 8000 ml = 8500 ml
  const addTiltRes = await inventoryRoute.PATCH(new Request('http://localhost/api/inventory', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'ADD_STOCK', boxType: 'CONSUMABLE_TILT', quantity: 0.5, unit: 'L' }),
  }));
  assert.equal(addTiltRes.status, 200);
  const addTiltJson = await addTiltRes.json();
  assert.equal(addTiltJson.consumableStock.availableStock, 8500);

  // 3. Remove 2.5 L Tilt -> -2500 ml = 6000 ml
  const remRes = await inventoryRoute.PATCH(new Request('http://localhost/api/inventory', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'REMOVE_STOCK', boxType: 'CONSUMABLE_TILT', quantity: 2.5, unit: 'L' }),
  }));
  assert.equal(remRes.status, 200);
  const remJson = await remRes.json();
  assert.equal(remJson.consumableStock.availableStock, 6000);

  // 4. Attempting to delete fixed chemical must return 400
  const delChemRes = await inventoryRoute.DELETE(new Request('http://localhost/api/inventory?category=CONSUMABLE&itemType=BAVISTIN', {
    method: 'DELETE',
  }));
  assert.equal(delChemRes.status, 400);

  // 5. Deleting regular consumable succeeds
  const delRegRes = await inventoryRoute.DELETE(new Request('http://localhost/api/inventory?category=CONSUMABLE&itemType=FOAM_PADS', {
    method: 'DELETE',
  }));
  assert.equal(delRegRes.status, 200);
});

test('PATCH /api/inventory DISPATCH_MATERIALS deducts brand boxes, packing consumables, and fixed chemicals', async () => {
  boxBrandStockDb.push({ brandId: 'brand-Star', boxType: 'BOX_7KG', availableStock: 200, issuedStock: 0 });
  harvestTasksDb.push({
    id: 'task-1',
    materialsIssued: false,
    requiredBoxCounts: { '7KG': 100 },
    brandBoxCounts: { Star: { '7KG': 100 } },
    targetRequiredBoxes: 100,
    favilocPackets: 5,
    rubberPackets: 1,
    germEthylenePaperSheets: 350,
    bagsKg7: 2.86,
    bagsKg13: 0,
    foamUnit: 1,
    hasChemicalTreatment: true,
    chemicals: ['C_CHEMICAL', 'TILT', 'BAVISTIN', 'TURTI'],
    chemicalQuantities: { C_CHEMICAL: '0.05 kg', TILT: '0.2 L', BAVISTIN: '1 kg', TURTI: '2 kg' },
  });

  const res = await inventoryRoute.PATCH(new Request('http://localhost/api/inventory', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'DISPATCH_MATERIALS',
      taskId: 'task-1',
      dispatchedCounts: { '7KG': 100 },
      dispatchedConsumables: {
        GERM_ETHYLENE_PAPER: 350,
        BAGS_7KG: 2.86,
        FOAM_PADS: 1,
        FAVILOC: 5,
        RUBBER: 1,
        C_CHEMICAL: 50,
        TILT: 200,
        BAVISTIN: 1000,
        TURTI: 2000,
      },
    }),
  }));

  assert.equal(res.status, 200);
  const byType = new Map(consumablesDb.map((r) => [r.itemType, r]));
  assert.equal(boxBrandStockDb[0].availableStock, 100);
  assert.equal(boxBrandStockDb[0].issuedStock, 100);
  assert.equal(byType.get('TILT').availableStock, 7800);
  assert.equal(byType.get('TILT').issuedStock, 200);
  assert.equal(byType.get('BAVISTIN').availableStock, 9000);
  assert.equal(byType.get('BAVISTIN').issuedStock, 1000);
  assert.equal(byType.get('GERM_ETHYLENE_PAPER').availableStock, 350);
  assert.equal(byType.get('GERM_ETHYLENE_PAPER').issuedStock, 350);
  assert.equal(byType.get('FOAM_PADS').availableStock, 299);
  assert.equal(harvestTasksDb[0].materialsIssued, true);
});

test('ensureStandardConsumables migrates legacy BAGS & germination/ethylene into split structure and removes CORNER_GUARDS', async () => {
  // Seed legacy CORNER_GUARDS row and old BAGS row
  consumablesDb.push(
    { id: 'c-corner', itemType: 'CORNER_GUARDS', availableStock: 50, issuedStock: 0, unit: 'Pieces' },
    { id: 'c-oldbags', itemType: 'BAGS', availableStock: 20, issuedStock: 0, unit: 'kg' },
    { id: 'c-oldgerm', itemType: 'GERMINATION_PAPER', availableStock: 50, issuedStock: 0, unit: 'kg' },
    { id: 'c-oldeth', itemType: 'ETHYLENE_POUCH', availableStock: 2, issuedStock: 0, unit: 'pouches' }
  );

  await consumables.ensureStandardConsumables(prisma);
  assert.equal(consumablesDb.some((r) => r.itemType === 'CORNER_GUARDS'), false);
  assert.equal(consumablesDb.some((r) => r.itemType === 'BAGS'), false);
  assert.equal(consumablesDb.find((r) => r.itemType === 'BAGS_7KG').unit, 'kg');
  assert.equal(consumablesDb.find((r) => r.itemType === 'BAGS_13KG').unit, 'kg');
  assert.equal(consumablesDb.find((r) => r.itemType === 'GERM_ETHYLENE_PAPER').unit, 'sheets');
  assert.equal(consumables.formatConsumableLabel('FOAM_PADS'), 'Foam');
  assert.equal(consumables.formatConsumableLabel('GERM_ETHYLENE_PAPER'), 'Germination Paper / Ethylene Pouch');
  assert.equal(consumables.formatConsumableLabel('BAGS_7KG'), '7KG Packing Bags');
  assert.equal(consumables.formatConsumableLabel('BAGS_13KG'), '13KG Packing Bags');

  // Add 100 sheets of GERM_ETHYLENE_PAPER and remove 2.25 kg of BAGS_7KG
  const addPaperRes = await inventoryRoute.PATCH(new Request('http://localhost/api/inventory', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'ADD_STOCK', boxType: 'CONSUMABLE_GERM_ETHYLENE_PAPER', quantity: 100, unit: 'sheets' }),
  }));
  const addPaperJson = await addPaperRes.json();
  assert.equal(addPaperRes.status, 200);
  assert.equal(addPaperJson.consumableStock.availableStock, 800);
  assert.equal(addPaperJson.consumableStock.unit, 'sheets');

  const remBagsRes = await inventoryRoute.PATCH(new Request('http://localhost/api/inventory', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'REMOVE_STOCK', boxType: 'CONSUMABLE_BAGS_7KG', quantity: 2.25, unit: 'kg' }),
  }));
  const remBagsJson = await remBagsRes.json();
  assert.equal(remBagsRes.status, 200);
  assert.equal(remBagsJson.consumableStock.availableStock, 47.75);
  assert.equal(remBagsJson.consumableStock.unit, 'kg');
});

test('custom inventory consumables sync and deduct accurately on dispatch', async () => {
  // Create custom packing item in Inventory: Packing Tape (rolls)
  const createRes = await inventoryRoute.PATCH(new Request('http://localhost/api/inventory', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'ADD_STOCK', boxType: 'CONSUMABLE_PACKING_TAPE', quantity: 12, unit: 'rolls' }),
  }));
  assert.equal(createRes.status, 200);
  assert.equal(consumablesDb.find((r) => r.itemType === 'PACKING_TAPE').availableStock, 12);

  // Schedule & dispatch task including the synced custom item + 13KG bags & paper
  boxBrandStockDb.push({ brandId: 'brand-Star', boxType: 'BOX_13KG', availableStock: 200, issuedStock: 0 });
  harvestTasksDb.push({
    id: 'task-sync',
    materialsIssued: false,
    requiredBoxCounts: { '13KG': 100 },
    brandBoxCounts: { Star: { '13KG': 100 } },
    targetRequiredBoxes: 100,
    favilocPackets: 5,
    rubberPackets: 1,
    germEthylenePaperSheets: 350,
    bagsKg7: 0,
    bagsKg13: 4,
    foamUnit: 1,
    extraConsumables: [{ itemType: 'PACKING_TAPE', label: 'Packing Tape', quantity: 2.5, unit: 'rolls' }],
    hasChemicalTreatment: false,
    chemicals: [],
  });

  const dispatchRes = await inventoryRoute.PATCH(new Request('http://localhost/api/inventory', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'DISPATCH_MATERIALS',
      taskId: 'task-sync',
      dispatchedCounts: { '13KG': 100 },
      dispatchedConsumables: { GERM_ETHYLENE_PAPER: 350, BAGS_13KG: 4, PACKING_TAPE: 2.5 },
    }),
  }));
  assert.equal(dispatchRes.status, 200);
  const byType = new Map(consumablesDb.map((r) => [r.itemType, r]));
  assert.equal(byType.get('GERM_ETHYLENE_PAPER').availableStock, 350);
  assert.equal(byType.get('GERM_ETHYLENE_PAPER').issuedStock, 350);
  assert.equal(byType.get('BAGS_13KG').availableStock, 46);
  assert.equal(byType.get('BAGS_13KG').issuedStock, 4);
  assert.equal(byType.get('PACKING_TAPE').availableStock, 9.5);
  assert.equal(byType.get('PACKING_TAPE').issuedStock, 2.5);
});

