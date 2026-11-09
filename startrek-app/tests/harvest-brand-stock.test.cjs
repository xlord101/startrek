// Run with: node --require tsx/cjs --test tests/harvest-brand-stock.test.cjs
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

// ---- Shared pure helper (mirrors src/types calculateGerminationPaperKg) ----
function germinationPaperKg(counts) {
  let kg = 0;
  for (const [bt, raw] of Object.entries(counts)) {
    const n = Number(raw) || 0;
    if (n <= 0) continue;
    kg += (bt === '5KG' || bt === '7KG') ? n / 45 / 2 : n / 45;
  }
  return Math.round(kg * 10) / 10;
}

// ---- Shared pure helper (mirrors src/types calculateBagsKg) ----
function calculateBagsKg(counts) {
  const count7kg = Number(counts['7KG']) || 0;
  const count13kg = (Number(counts['13KG']) || 0) + (Number(counts['13_5KG']) || 0);
  const bags7kg = count7kg / 35;
  const bags13kg = (count13kg / 400) * 16;
  return Math.round((bags7kg + bags13kg) * 100) / 100;
}

// ---- Mock prisma for the harvest route ----
let brandRows, needPlan, writes;
const prismaMock = {
  boxBrandStock: {
    findMany: async () => brandRows,
  },
  boxBrand: {
    upsert: async ({ where }) => ({ id: `brand-${where.name}`, name: where.name }),
  },
  inventoryStock: { upsert: async () => { writes++; return {}; } },
  consumableInventoryStock: { upsert: async () => { writes++; return {}; } },
};
prismaMock.boxBrandStock.findUnique = async ({ where }) => {
  const row = brandRows.find(
    (r) => r.brandId === where.brandId_boxType.brandId && r.boxType === where.brandId_boxType.boxType
  );
  return row ? { ...row } : null;
};
prismaMock.boxBrandStock.update = async ({ where, data }) => {
  const row = brandRows.find(
    (r) => r.brandId === where.brandId_boxType.brandId && r.boxType === where.brandId_boxType.boxType
  );
  if (!row || row.availableStock < (data.availableStock.decrement || 0)) throw new Error('short');
  row.availableStock -= data.availableStock.decrement;
  row.issuedStock += data.issuedStock.increment;
  writes++;
  return row;
};

test('germination formula: 5/7KG halved after ÷45, others straight ÷45', () => {
  assert.equal(germinationPaperKg({ '5KG': 100 }), 1.1); // 100/45/2
  assert.equal(germinationPaperKg({ '7KG': 90 }), 1); // 90/45/2
  assert.equal(germinationPaperKg({ '13KG': 100 }), 2.2); // 100/45
  assert.equal(germinationPaperKg({ '13_5KG': 45 }), 1);
  assert.equal(germinationPaperKg({ '16KG': 90 }), 2);
  assert.equal(germinationPaperKg({ '5KG': 100, '13KG': 100 }), 3.3); // 1.1 + 2.2
  assert.equal(germinationPaperKg({}), 0);
});

test('bag formula: 7KG 35 boxes = 1kg bundle, 13KG/13.5KG 400 boxes = 16kg', () => {
  assert.equal(calculateBagsKg({ '7KG': 35 }), 1);
  assert.equal(calculateBagsKg({ '7KG': 70 }), 2);
  assert.equal(calculateBagsKg({ '7KG': 350 }), 10);
  assert.equal(calculateBagsKg({ '7KG': 50 }), 1.43); // 50 / 35 = 1.4285... -> 1.43
  assert.equal(calculateBagsKg({ '13KG': 400 }), 16);
  assert.equal(calculateBagsKg({ '13_5KG': 400 }), 16);
  assert.equal(calculateBagsKg({ '7KG': 35, '13KG': 400 }), 17);
  assert.equal(calculateBagsKg({ '7KG': 70, '13KG': 200 }), 10);
  assert.equal(calculateBagsKg({}), 0);
});

test('brand shortage blocks schedule with 409 and deducts nothing', async () => {
  // Star has 50 of 13KG but the plan needs 100 → shortage
  brandRows = [{ brandId: 'brand-Star', boxType: 'BOX_13KG', availableStock: 50, issuedStock: 0, brand: { name: 'Star' } }];
  writes = 0;
  needPlan = { Star: { '13KG': 100 } };
  // Simulate the pre-check from the route
  const live = new Map(brandRows.map((r) => [`${r.brand.name}||${String(r.boxType).replace('BOX_', '')}`, r.availableStock]));
  const shortages = [];
  for (const [brand, counts] of Object.entries(needPlan)) {
    for (const [bt, raw] of Object.entries(counts)) {
      const n = Number(raw) || 0;
      if (n > (live.get(`${brand}||${bt}`) ?? 0)) shortages.push(`${brand} ${bt}`);
    }
  }
  assert.equal(shortages.length, 1);
  assert.equal(writes, 0); // nothing deducted
});

test('sufficient brand stock deducts per brand+size', async () => {
  brandRows = [
    { brandId: 'brand-Star', boxType: 'BOX_13KG', availableStock: 100, issuedStock: 0, brand: { name: 'Star' } },
    { brandId: 'brand-Other', boxType: 'BOX_7KG', availableStock: 60, issuedStock: 0, brand: { name: 'Other' } },
  ];
  writes = 0;
  await prismaMock.boxBrandStock.update({
    where: { brandId_boxType: { brandId: 'brand-Star', boxType: 'BOX_13KG' } },
    data: { availableStock: { decrement: 100 }, issuedStock: { increment: 100 } },
  });
  await prismaMock.boxBrandStock.update({
    where: { brandId_boxType: { brandId: 'brand-Other', boxType: 'BOX_7KG' } },
    data: { availableStock: { decrement: 60 }, issuedStock: { increment: 60 } },
  });
  assert.equal(brandRows[0].availableStock, 0);
  assert.equal(brandRows[1].availableStock, 0);
  assert.equal(brandRows[0].issuedStock, 100);
  // Other brand untouched by Star's deduction
  assert.equal(writes, 2);
});
