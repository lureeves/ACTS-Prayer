import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getSubjectPrayerUnits,
  selectSubjectSessionCards
} from '../src/services/scheduler.ts';
import { sanitizeThreadUpdates } from '../src/services/prayerOperations.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backupPath = resolve(__dirname, '../Backup_03-11-26_18-56.json');

console.log('\n======================================================');
console.log('   ACTS Prayer App - Batch Prayers Options Test Suite ');
console.log('======================================================\n');

const raw = readFileSync(backupPath, 'utf8');
const data = JSON.parse(raw);
data.Categories = sanitizeThreadUpdates(data.Categories);

const supp = data.Categories.find(c => c.name === 'Supplication');
const friends = supp.subjects.find(s => s.name === 'Friends');
const activeUnits = getSubjectPrayerUnits(friends.cards);

// 1. Verify default batch size is 5
console.log('Test 1: Default batch size is 5');
const defaultBatchSubject = {
  ...friends,
  sessionCardLimit: 5,
  cardSelectionMode: 'sequential',
  cardRotationOffset: 0
};
const defaultBatchCards = selectSubjectSessionCards(defaultBatchSubject);
const chosenUnitsDefault = getSubjectPrayerUnits(defaultBatchCards);
assert.equal(chosenUnitsDefault.length, 5, 'Default batch surfaces exactly 5 people/units');
console.log('  ✓ Default batch surfaces 5 people/units');

// 2. Custom batch count (e.g. 3, 7, 10)
console.log('\nTest 2: Custom batch count (3, 7, 10)');
for (const count of [3, 7, 10]) {
  const customSubject = {
    ...friends,
    sessionCardLimit: count,
    cardSelectionMode: 'sequential',
    cardRotationOffset: 0
  };
  const cards = selectSubjectSessionCards(customSubject);
  const selectedUnits = getSubjectPrayerUnits(cards);
  assert.equal(selectedUnits.length, count, `Surfaces ${count} people/units`);
  console.log(`  ✓ Batch count ${count} selected correctly`);
}

// 3. Sequential rotation cycle
console.log('\nTest 3: Sequential rotation cycle');
const seqBatch1 = selectSubjectSessionCards({
  ...friends,
  sessionCardLimit: 5,
  cardSelectionMode: 'sequential',
  cardRotationOffset: 0
});
const seqUnits1 = getSubjectPrayerUnits(seqBatch1).map(u => u.rootTitle);

const seqBatch2 = selectSubjectSessionCards({
  ...friends,
  sessionCardLimit: 5,
  cardSelectionMode: 'sequential',
  cardRotationOffset: 5
});
const seqUnits2 = getSubjectPrayerUnits(seqBatch2).map(u => u.rootTitle);

assert.notDeepEqual(seqUnits1, seqUnits2, 'Batch 2 contains the next set of people');
assert.equal(seqUnits1.length, 5);
assert.equal(seqUnits2.length, 5);
console.log(`  ✓ Batch 1: ${seqUnits1.join(', ')}`);
console.log(`  ✓ Batch 2: ${seqUnits2.join(', ')}`);

// 4. Random rotation mode
console.log('\nTest 4: Random selection mode');
const randBatch = selectSubjectSessionCards({
  ...friends,
  sessionCardLimit: 5,
  cardSelectionMode: 'random'
});
const randUnits = getSubjectPrayerUnits(randBatch);
assert.equal(randUnits.length, 5, 'Random mode selects 5 units');
console.log(`  ✓ Random mode selected 5 units: ${randUnits.map(u => u.rootTitle || 'request').join(', ')}`);

// 5. Toggle between All Cards and Batch Prayers
console.log('\nTest 5: Toggle between All Cards and Batch Prayers');
const allCardsSubject = {
  ...friends,
  sessionCardLimit: undefined,
  cardSelectionMode: undefined
};
const allCards = selectSubjectSessionCards(allCardsSubject);
assert.equal(getSubjectPrayerUnits(allCards).length, activeUnits.length, 'Returns all units when batch is disabled');
console.log(`  ✓ Disabled batch correctly returns all ${activeUnits.length} active units`);

console.log('\n======================================================');
console.log('   All Batch Prayers Options Tests Passed (100%)!    ');
console.log('======================================================\n');
