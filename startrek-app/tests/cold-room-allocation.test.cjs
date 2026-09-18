const { test } = require('node:test');
const assert = require('node:assert/strict');
const { acceptedBoxes, validateAllocationDrafts, distributeAllocationRows } = require('../src/lib/allocation-plan.ts');
const { parseAllocationRows, allocateRooms } = require('../src/lib/cold-room-allocation.ts');
const { COLD_STORAGE_ROOMS: rooms, COLD_ROOM_CAPACITY: capacity } = require('../src/types/index.ts');
const row = (patch = {}) => ({ roomNumber: rooms[0], brandName: 'Star', boxType: '13KG', boxCount: 90, ...patch });

 test('accepted stock subtracts damage and preserves an explicit zero received count', () => {
  assert.equal(acceptedBoxes({ verifiedBoxCount: 100, qualityReport: { damageBox: 10 } }), 90);
  assert.equal(acceptedBoxes({ verifiedBoxCount: 0, dispatchedTotalBoxes: 100 }), 0);
});
test('allocation draft requires an explicit valid size and exact accepted total', () => {
  assert.doesNotThrow(() => validateAllocationDrafts([row()], 90));
  for (const patch of [{ boxType: '' }, { boxType: '300KG' }, { boxCount: -1 }, { boxCount: 1.5 }, { brandName: ' ' }]) {
    assert.throws(() => validateAllocationDrafts([row(patch)], 90));
  }
  assert.throws(() => validateAllocationDrafts([row({ boxCount: 100 })], 90));
});
test('API normalizes UI size without guessing legacy unknown sizes', () => {
  assert.equal(parseAllocationRows([row()])[0].boxType, 'BOX_13KG');
  assert.equal(parseAllocationRows([row({ boxType: 'BOX_7KG' })])[0].boxType, 'BOX_7KG');
  for (const value of [null, '', 'unknown']) assert.throws(() => parseAllocationRows([row({ boxType: value })]));
});
test('distribution splits occupied rooms while preserving each brand and size', () => {
  const input = [row({ boxCount: 100 }), row({ brandName: 'Other', boxType: '7KG', boxCount: 50 })];
  const snapshot = structuredClone(input);
  assert.deepEqual(distributeAllocationRows(input, { [rooms[0]]: capacity - 40 }), [
    row({ boxCount: 40 }), row({ roomNumber: rooms[1], boxCount: 60 }),
    row({ roomNumber: rooms[1], brandName: 'Other', boxType: '7KG', boxCount: 50 }),
  ]);
  assert.deepEqual(input, snapshot);
});
test('full rooms reject overflow without modifying draft rows', () => {
  const input = [row()];
  assert.throws(() => distributeAllocationRows(input, Object.fromEntries(rooms.map(r => [r, capacity]))), /Not enough room capacity/);
  assert.deepEqual(input, [row()]);
});

function database({ used = 0, shipped = 0, verified = 100, damage = 10 } = {}) {
  const calls = [];
  const tx = {
    coldStorageReceipt: {
      findUnique: async () => ({ status: 'VERIFIED_RECEIVED', verifiedBoxCount: verified,
        allocations: [{ shippedBoxes: shipped }], qualityReport: { damageBox: damage } }),
      update: async args => { calls.push(['save', args]); return args.data; },
    },
    coldRoomAllocation: {
      groupBy: async args => { calls.push(['occupancy', args]); return [{ roomNumber: rooms[0], _sum: { boxCount: used } }]; },
      deleteMany: async args => { calls.push(['delete', args]); },
    },
  };
  return { tx, calls };
}
test('allocation saves typed stock at exact capacity, excluding own old allocations', async () => {
  const { tx, calls } = database({ used: capacity - 90 });
  await allocateRooms(tx, 'receipt', parseAllocationRows([row()]));
  assert.equal(calls[0][1].where.receiptId.not, 'receipt');
  assert.deepEqual(calls.map(c => c[0]), ['occupancy', 'delete', 'save']);
  assert.equal(calls[2][1].data.allocations.create[0].boxType, 'BOX_13KG');
});
test('capacity overflow and duplicate room lines reject before any writes', async () => {
  const { tx, calls } = database({ used: capacity - 89 });
  await assert.rejects(allocateRooms(tx, 'receipt', parseAllocationRows([row({ boxCount: 40 }), row({ boxCount: 50 })])), /another room/);
  assert.deepEqual(calls.map(c => c[0]), ['occupancy']);
});
test('shipped receipts cannot recreate shipped stock through reallocation', async () => {
  const { tx, calls } = database({ shipped: 1 });
  await assert.rejects(allocateRooms(tx, 'receipt', parseAllocationRows([row()])), /already shipped/);
  assert.equal(calls.length, 0);
});
test('received minus damaged must match before allocation writes', async () => {
  const { tx, calls } = database();
  await assert.rejects(allocateRooms(tx, 'receipt', parseAllocationRows([row({ boxCount: 100 })])), /90 accepted boxes/);
  assert.equal(calls.length, 0);
});
