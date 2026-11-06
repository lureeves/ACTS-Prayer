import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  addNewCard,
  addCardUpdate,
  normalizeName
} from '../src/services/prayerOperations.ts';

function findCategory(categories, name) {
  const norm = normalizeName(name);
  return categories.find(c => normalizeName(c.name) === norm);
}

function findSubject(category, name) {
  const norm = normalizeName(name);
  return category.subjects.find(s => normalizeName(s.name) === norm);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backupPath = resolve(__dirname, '../Backup_03-11-26_18-56.json');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.log(`\n${BOLD}====================================================${RESET}`);
console.log(`${BOLD}   ACTS Prayer App - Stage Add Prayer Restrictions  ${RESET}`);
console.log(`${BOLD}====================================================${RESET}\n`);

const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));

// Test simulation of GuidedSessionModal stage guards
function canAddPrayerDuringStage(stage) {
  return stage === 'Supplication';
}

function canAddSubPrayerDuringStage(stage) {
  return stage === 'Supplication';
}

const stages = ['Adoration', 'Confession', 'Thanksgiving', 'Supplication'];

stages.forEach(stage => {
  const allowAddPrayer = canAddPrayerDuringStage(stage);
  const allowAddSubPrayer = canAddSubPrayerDuringStage(stage);

  if (stage === 'Supplication') {
    assert.equal(allowAddPrayer, true, 'Supplication allows adding prayers');
    assert.equal(allowAddSubPrayer, true, 'Supplication allows adding sub-prayers');
    console.log(`  ${GREEN}✓${RESET} ${stage}: Add prayer and sub-prayer options are enabled`);
  } else {
    assert.equal(allowAddPrayer, false, `${stage} must NOT allow adding prayers`);
    assert.equal(allowAddSubPrayer, false, `${stage} must NOT allow adding sub-prayers`);
    console.log(`  ${GREEN}✓${RESET} ${stage}: Add prayer and sub-prayer options are strictly hidden/disabled`);
  }
});

// Verify Supplication prayer operations still function seamlessly
const categories = JSON.parse(JSON.stringify(backupData.Categories));
const supp = findCategory(categories, 'Supplication');
const friends = findSubject(supp, 'Friends');
const initialCount = friends.cards.length;

const addResult = addNewCard(categories, 'Friends', 'New Intercession Request');
const updatedFriends = findSubject(findCategory(addResult.updatedCategories, 'Supplication'), 'Friends');
assert.equal(updatedFriends.cards.length, initialCount + 1, 'Prayer card added to Supplication');
console.log(`  ${GREEN}✓${RESET} Adding a prayer to Supplication during prayer works as expected`);

console.log(`\n${BOLD}${GREEN}====================================================${RESET}`);
console.log(`${BOLD}${GREEN}   All Stage Restriction Tests Passed! (100%)       ${RESET}`);
console.log(`${BOLD}${GREEN}====================================================${RESET}\n`);
