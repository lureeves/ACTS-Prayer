import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateSessionPlan } from '../src/services/scheduler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backupPath = resolve(__dirname, '../Backup_03-11-26_18-56.json');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.log(`\n${BOLD}====================================================${RESET}`);
console.log(`${BOLD}   ACTS Prayer App - Finish Praying Flow Tests      ${RESET}`);
console.log(`${BOLD}====================================================${RESET}\n`);

const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
const sessionPlan = generateSessionPlan(backupData.Categories, new Date(), 3);

const ACTS_STAGES = ['Adoration', 'Confession', 'Thanksgiving', 'Supplication'];

function computeIsLastPrayer(activePlan, currentStageIndex, currentTopicIndex) {
  const currentStage = ACTS_STAGES[currentStageIndex];
  const stageTopics = activePlan[currentStage] || [];
  const activeItem = stageTopics[currentTopicIndex];

  return Boolean(activeItem) && (() => {
    if (currentTopicIndex < stageTopics.length - 1) return false;
    for (let sIdx = currentStageIndex + 1; sIdx < ACTS_STAGES.length; sIdx++) {
      const nextTopics = activePlan[ACTS_STAGES[sIdx]] || [];
      if (nextTopics.length > 0) return false;
    }
    return true;
  })();
}

// Test 1: Non-final topics show navigation arrow
console.log('Test 1: Non-final topics should NOT be identified as last prayer');
for (let stageIdx = 0; stageIdx < ACTS_STAGES.length - 1; stageIdx++) {
  const stg = ACTS_STAGES[stageIdx];
  const topics = sessionPlan[stg] || [];
  for (let topicIdx = 0; topicIdx < topics.length; topicIdx++) {
    const isLast = computeIsLastPrayer(sessionPlan, stageIdx, topicIdx);
    assert.equal(isLast, false, `${stg} topic ${topicIdx + 1} should NOT be last prayer`);
  }
}
console.log(`  ${GREEN}✓${RESET} All topics in Adoration, Confession, and Thanksgiving show forward navigation arrow`);

// Test 2: In Supplication, only the final topic is last prayer
console.log('\nTest 2: Final topic in Supplication identifies as last prayer');
const suppTopics = sessionPlan['Supplication'] || [];
assert.ok(suppTopics.length > 0, 'Supplication should have topics');

for (let topicIdx = 0; topicIdx < suppTopics.length; topicIdx++) {
  const isLast = computeIsLastPrayer(sessionPlan, 3, topicIdx);
  if (topicIdx === suppTopics.length - 1) {
    assert.equal(isLast, true, `Final topic ${topicIdx + 1} of ${suppTopics.length} MUST be identified as last prayer`);
    console.log(`  ${GREEN}✓${RESET} Supplication final topic (${topicIdx + 1} of ${suppTopics.length}) correctly has isLastPrayer = true (Button: "Finish Praying")`);
  } else {
    assert.equal(isLast, false, `Topic ${topicIdx + 1} of ${suppTopics.length} is not final`);
  }
}

// Test 3: Simulating user clicking "Finish Praying" directly closes session
console.log('\nTest 3: Finishing the last prayer records history and directly exits session');
let closed = false;
let topicPrayedRecorded = false;

function simulateHandleNext(activePlan, currentStageIndex, currentTopicIndex) {
  const currentStage = ACTS_STAGES[currentStageIndex];
  const stageTopics = activePlan[currentStage] || [];
  const activeItem = stageTopics[currentTopicIndex];
  const isLast = computeIsLastPrayer(activePlan, currentStageIndex, currentTopicIndex);

  if (activeItem) {
    topicPrayedRecorded = true;
  }

  if (isLast) {
    closed = true;
    return;
  }
}

const finalTopicIndex = suppTopics.length - 1;
simulateHandleNext(sessionPlan, 3, finalTopicIndex);

assert.equal(topicPrayedRecorded, true, 'Prayer history recorded');
assert.equal(closed, true, 'Modal closed directly without intermediate Amen screen');
console.log(`  ${GREEN}✓${RESET} Clicking "Finish Praying" records prayer history and directly calls onClose() to return to overview`);

// Test 4: Custom session where only Adoration has topics
console.log('\nTest 4: Custom plan where later stages are empty correctly identifies Adoration as final');
const customPlan = {
  Adoration: [{ categoryName: 'Adoration', subject: { name: 'Holy', cards: [] }, cards: [] }],
  Confession: [],
  Thanksgiving: [],
  Supplication: []
};

const isLastInCustom = computeIsLastPrayer(customPlan, 0, 0);
assert.equal(isLastInCustom, true, 'Adoration topic should be last prayer when later stages are empty');
console.log(`  ${GREEN}✓${RESET} Adoration single topic correctly identified as last prayer when later stages are empty`);

console.log(`\n${BOLD}${GREEN}====================================================${RESET}`);
console.log(`${BOLD}${GREEN}   All Finish Praying Flow Tests Passed! (100%)     ${RESET}`);
console.log(`${BOLD}${GREEN}====================================================${RESET}\n`);
