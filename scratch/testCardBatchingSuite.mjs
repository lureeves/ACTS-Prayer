import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getSubjectPrayerUnits,
  selectSubjectSessionCards,
  generateSessionPlan
} from '../src/services/scheduler.ts';
import { sanitizeThreadUpdates } from '../src/services/prayerOperations.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backupPath = resolve(__dirname, '../Backup_03-11-26_18-56.json');

console.log('\n====================================================');
console.log('   ACTS Prayer App - Card Batching & Limit Tests    ');
console.log('====================================================\n');

function loadData() {
  const raw = readFileSync(backupPath, 'utf8');
  const data = JSON.parse(raw);
  data.Categories = sanitizeThreadUpdates(data.Categories);
  return data;
}

const data = loadData();
const supp = data.Categories.find(c => c.name === 'Supplication');
const friends = supp.subjects.find(s => s.name === 'Friends');

assert.ok(friends, 'Friends subject should exist');

// Test 1: getSubjectPrayerUnits grouping
console.log('Test 1: Prayer Units identification');
const units = getSubjectPrayerUnits(friends.cards);
console.log(`  Found ${units.length} distinct people/prayer units in Friends.`);
assert.ok(units.length >= 20, 'Should have at least 20 active people in Friends');

// Verify Luke Larco unit has all active sub-prayers grouped under 1 unit
const lukeUnit = units.find(u => u.rootTitle === 'Luke Larco');
assert.ok(lukeUnit, 'Luke Larco should be identified as a unit');
assert.ok(lukeUnit.activeCards.length >= 2, 'Luke Larco should have his sub-prayers in activeCards');
console.log('  ✓ Multi-update thread correctly treated as 1 prayer unit');

// Test 2: Default without limit returns all active cards
console.log('\nTest 2: Default behavior (no limit)');
const allCards = selectSubjectSessionCards(friends);
assert.equal(allCards.length, units.flatMap(u => u.activeCards).length, 'Returns all active cards when limit is unset');
console.log('  ✓ Returns all active requests when limit is not configured');

// Test 3: Sequential Batching (e.g. 5 people per session)
console.log('\nTest 3: Sequential Batching (5 people per session)');
const subjectWithLimit = {
  ...friends,
  sessionCardLimit: 5,
  cardSelectionMode: 'sequential',
  cardRotationOffset: 0
};

// Batch 1 (offset 0): items 0 to 4
const batch1Cards = selectSubjectSessionCards(subjectWithLimit);
const batch1Units = getSubjectPrayerUnits(batch1Cards);
assert.equal(batch1Units.length, 5, 'Batch 1 should have exactly 5 people');
const expectedBatch1Ids = units.slice(0, 5).map(u => u.id);
const actualBatch1Ids = batch1Units.map(u => u.id);
assert.deepEqual(actualBatch1Ids, expectedBatch1Ids, 'Batch 1 should match first 5 people in order');
console.log(`  ✓ Batch 1 (items 1-5): ${units.slice(0, 5).map(u => u.rootTitle).join(', ')}`);

// Advance offset by 5 -> Batch 2 (offset 5): items 5 to 9
const subjectOffset5 = {
  ...subjectWithLimit,
  cardRotationOffset: 5
};
const batch2Cards = selectSubjectSessionCards(subjectOffset5);
const batch2Units = getSubjectPrayerUnits(batch2Cards);
assert.equal(batch2Units.length, 5, 'Batch 2 should have exactly 5 people');
const expectedBatch2Ids = units.slice(5, 10).map(u => u.id);
const actualBatch2Ids = batch2Units.map(u => u.id);
assert.deepEqual(actualBatch2Ids, expectedBatch2Ids, 'Batch 2 should match next 5 people in order');
console.log(`  ✓ Batch 2 (items 6-10): ${units.slice(5, 10).map(u => u.rootTitle).join(', ')}`);

// Advance offset by 5 -> Batch 3 (offset 10): items 10 to 14
const subjectOffset10 = {
  ...subjectWithLimit,
  cardRotationOffset: 10
};
const batch3Cards = selectSubjectSessionCards(subjectOffset10);
const batch3Units = getSubjectPrayerUnits(batch3Cards);
assert.equal(batch3Units.length, 5, 'Batch 3 should have exactly 5 people');
const expectedBatch3Ids = units.slice(10, 15).map(u => u.id);
const actualBatch3Ids = batch3Units.map(u => u.id);
assert.deepEqual(actualBatch3Ids, expectedBatch3Ids, 'Batch 3 should match next 5 people in order');
console.log(`  ✓ Batch 3 (items 11-15): ${units.slice(10, 15).map(u => u.rootTitle).join(', ')}`);

// Test 4: Wrap-around when offset reaches end of list
console.log('\nTest 4: Wrap-around at list boundary');
const total = units.length;
const subjectNearEnd = {
  ...subjectWithLimit,
  cardRotationOffset: total - 2 // e.g. item 21 of 23
};
const wrapCards = selectSubjectSessionCards(subjectNearEnd);
const wrapUnits = getSubjectPrayerUnits(wrapCards);
assert.equal(wrapUnits.length, 5, 'Wrap batch should still have 5 items');
assert.equal(wrapUnits[0].id, units[total - 2].id);
assert.equal(wrapUnits[1].id, units[total - 1].id);
assert.equal(wrapUnits[2].id, units[0].id, 'Item 3 wraps to item 0');
assert.equal(wrapUnits[3].id, units[1].id, 'Item 4 wraps to item 1');
assert.equal(wrapUnits[4].id, units[2].id, 'Item 5 wraps to item 2');
console.log('  ✓ Wrap-around smoothly loops back to the start of the list');

// Test 5: Random selection mode
console.log('\nTest 5: Random selection mode');
const subjectRandom = {
  ...friends,
  sessionCardLimit: 5,
  cardSelectionMode: 'random'
};
const randomCards = selectSubjectSessionCards(subjectRandom);
const randomUnits = getSubjectPrayerUnits(randomCards);
assert.equal(randomUnits.length, 5, 'Random selection should return exactly 5 people');
console.log(`  ✓ Random batch selected 5 people: ${randomUnits.map(u => u.rootTitle).join(', ')}`);

// Test 6: Full Session Plan Integration
console.log('\nTest 6: Full Session Plan Integration');
const testCategories = JSON.parse(JSON.stringify(data.Categories));
const testSupp = testCategories.find(c => c.name === 'Supplication');
const testFriends = testSupp.subjects.find(s => s.name === 'Friends');
testFriends.sessionCardLimit = 5;
testFriends.cardSelectionMode = 'sequential';
testFriends.cardRotationOffset = 0;

const plan = generateSessionPlan(testCategories, new Date(), 3);
const suppItems = plan.Supplication;
const friendsInPlan = suppItems.find(item => item.subject.name === 'Friends');
if (friendsInPlan) {
  const planFriendsUnits = getSubjectPrayerUnits(friendsInPlan.cards);
  assert.equal(planFriendsUnits.length, 5, 'Session plan Friends topic should contain exactly 5 people');
  console.log('  ✓ Session plan successfully generates topic with 5-person batch');
} else {
  console.log('  ℹ Friends not in today\'s rotation pool (skipping plan assert)');
}

console.log('\n====================================================');
console.log('   All Card Batching & Rotation Tests Passed! (100%)');
console.log('====================================================\n');
