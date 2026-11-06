import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Import pure operations under test from src/services/prayerOperations.ts
import {
  sanitizeThreadUpdates,
  moveCardsToArchive,
  addNewCard,
  addCardUpdate,
  unarchiveCard,
  deleteArchivedCard,
  deleteArchivedSubject,
  normalizeName
} from '../src/services/prayerOperations.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backupPath = resolve(__dirname, '../Backup_03-11-26_18-56.json');

// Colors for clean output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${GREEN}✓${RESET} ${testName}`);
  } catch (err) {
    console.error(`  ${RED}✗${RESET} ${testName}`);
    console.error(`    ${RED}${err.message}${RESET}`);
    if (err.stack) {
      console.error(`    ${err.stack.split('\n').slice(1, 4).join('\n    ')}`);
    }
    throw err;
  }
}

function loadBackupData() {
  const raw = readFileSync(backupPath, 'utf8');
  const data = JSON.parse(raw);
  // Apply initialization sanitization as App.tsx does on mount
  data.Categories = sanitizeThreadUpdates(data.Categories);
  return data;
}

function findCategory(categories, catName) {
  return categories.find(c => normalizeName(c.name) === normalizeName(catName));
}

function findSubject(category, subName) {
  return category?.subjects.find(s => normalizeName(s.name) === normalizeName(subName));
}

console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
console.log(`${BOLD}${CYAN}   ACTS Prayer App - Archive & Prayer Suite Tests   ${RESET}`);
console.log(`${BOLD}${CYAN}====================================================${RESET}\n`);

// -----------------------------------------------------------------------------
// Suite 1: Archiving a sub-prayer from a thread
// -----------------------------------------------------------------------------
console.log(`${BOLD}Suite 1: Archiving a sub-prayer from a thread (e.g. Luke Larco, Thiggy)${RESET}`);

runTest('1.1 Archiving a sub-prayer of "Luke Larco" moves it to Archive with proper metadata and leaves parent/other updates intact', () => {
  const data = loadBackupData();
  const supp = findCategory(data.Categories, 'Supplication');
  const friends = findSubject(supp, 'Friends');
  assert.ok(friends, 'Friends subject should exist in Supplication');

  // Find Luke Larco root and updates
  const lukeRoot = friends.cards.find(c => c.text === 'Luke Larco');
  assert.ok(lukeRoot, 'Luke Larco root card should exist');
  const lukeThreadKey = lukeRoot.stackGroup || lukeRoot.threadId;

  const lukeUpdates = friends.cards.filter(c => (c.stackGroup === lukeThreadKey || c.threadId === lukeThreadKey) && c !== lukeRoot);
  assert.ok(lukeUpdates.length >= 2, 'Luke Larco should have at least 2 updates in test data');
  const targetUpdate = lukeUpdates[0];
  const initialCardsCount = friends.cards.length;

  // Execute archive of single update
  const { updatedCategories, archivedCards } = moveCardsToArchive(data.Categories, 'Friends', targetUpdate);

  // Verification 1: Target update removed from active subject
  const updatedSupp = findCategory(updatedCategories, 'Supplication');
  const updatedFriends = findSubject(updatedSupp, 'Friends');
  assert.equal(updatedFriends.cards.length, initialCardsCount - 1, 'Original subject should have 1 fewer card');
  assert.ok(!updatedFriends.cards.some(c => c.createdDate === targetUpdate.createdDate), 'Archived sub-prayer must be removed from original subject');

  // Verification 2: Parent card remains in original subject
  const remainingRoot = updatedFriends.cards.find(c => c.text === 'Luke Larco');
  assert.ok(remainingRoot, 'Luke Larco root card must remain in Friends subject');
  assert.equal(remainingRoot.archived, true, 'Parent container remains archived: true');

  // Verification 3: Other sub-prayers remain in original subject
  const remainingUpdates = updatedFriends.cards.filter(c => (c.stackGroup === lukeThreadKey || c.threadId === lukeThreadKey) && c !== lukeRoot);
  assert.equal(remainingUpdates.length, lukeUpdates.length - 1, 'Other sub-prayers must remain in Friends subject');
  for (const remaining of remainingUpdates) {
    assert.equal(remaining.archived, false, 'Other sub-prayers must remain active (archived: false)');
  }

  // Verification 4: Sub-prayer moved to Archive category under proper subject
  const archiveCat = findCategory(updatedCategories, 'Archive');
  assert.ok(archiveCat, 'Archive category must exist');
  assert.equal(archiveCat.visible, true, 'Archive category must be visible');
  const archiveFriends = findSubject(archiveCat, 'Friends');
  assert.ok(archiveFriends, 'Archive category must have "Friends" subject');

  const archivedCard = archiveFriends.cards.find(c => c.createdDate === targetUpdate.createdDate);
  assert.ok(archivedCard, 'Sub-prayer must exist in Archive > Friends');
  assert.equal(archivedCard.userArchived, true, 'userArchived must be true');
  assert.equal(archivedCard.archived, true, 'archived must be true');
  assert.equal(archivedCard.originalTopic, 'Luke Larco', 'originalTopic must match parent title ("Luke Larco")');
  assert.equal(archivedCard.originalSubject, 'Friends', 'originalSubject must match "Friends"');
  assert.equal(archivedCard.originalCategory, 'Supplication', 'originalCategory must match "Supplication"');
  assert.ok(archivedCard.archivedDate, 'archivedDate must be recorded');
});

runTest('1.2 Archiving a sub-prayer of "Thiggy" moves it to Archive and leaves parent intact in My Guys', () => {
  const data = loadBackupData();
  const supp = findCategory(data.Categories, 'Supplication');
  const myGuys = findSubject(supp, 'My Guys');
  assert.ok(myGuys, 'My Guys subject should exist');

  const thiggyRoot = myGuys.cards.find(c => c.text.includes('Thiggy'));
  assert.ok(thiggyRoot, 'Thiggy root card should exist');
  const thiggyKey = thiggyRoot.stackGroup || thiggyRoot.threadId;

  const thiggyUpdate = myGuys.cards.find(c => (c.stackGroup === thiggyKey || c.threadId === thiggyKey) && c !== thiggyRoot);
  assert.ok(thiggyUpdate, 'Thiggy update sub-prayer should exist');

  const { updatedCategories } = moveCardsToArchive(data.Categories, 'My Guys', thiggyUpdate);

  const updatedSupp = findCategory(updatedCategories, 'Supplication');
  const updatedMyGuys = findSubject(updatedSupp, 'My Guys');
  assert.ok(!updatedMyGuys.cards.some(c => c.createdDate === thiggyUpdate.createdDate), 'Thiggy sub-prayer removed from My Guys');
  assert.ok(updatedMyGuys.cards.some(c => c.text === thiggyRoot.text), 'Thiggy root card remains in My Guys');

  const archiveCat = findCategory(updatedCategories, 'Archive');
  const archiveMyGuys = findSubject(archiveCat, 'My Guys');
  assert.ok(archiveMyGuys, 'Archive category must have My Guys subject');
  const archived = archiveMyGuys.cards.find(c => c.createdDate === thiggyUpdate.createdDate);
  assert.ok(archived, 'Thiggy update must be in Archive > My Guys');
  assert.equal(archived.userArchived, true);
  assert.equal(archived.archived, true);
  assert.equal(archived.originalTopic, thiggyRoot.text, 'originalTopic matches parent card text');
});

// -----------------------------------------------------------------------------
// Suite 2: Archiving an entire parent prayer / thread
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}Suite 2: Archiving an entire parent prayer / thread (e.g. James Goodrich, Thiggy)${RESET}`);

runTest('2.1 Archiving parent prayer "James Goodrich" moves all thread cards to Archive and removes them from active cards', () => {
  const data = loadBackupData();
  const supp = findCategory(data.Categories, 'Supplication');
  const friends = findSubject(supp, 'Friends');

  const jamesRoot = friends.cards.find(c => c.text === 'James Goodrich');
  assert.ok(jamesRoot, 'James Goodrich root card should exist');
  const threadKey = jamesRoot.stackGroup || jamesRoot.threadId;
  const initialThreadCards = friends.cards.filter(c => c.stackGroup === threadKey || c.threadId === threadKey);
  assert.ok(initialThreadCards.length >= 2, 'James Goodrich thread should have at least 2 cards');

  // Archive parent card
  const { updatedCategories, archivedCards } = moveCardsToArchive(data.Categories, 'Friends', jamesRoot);

  // Verification 1: All cards in thread removed from active cards in Friends
  const updatedSupp = findCategory(updatedCategories, 'Supplication');
  const updatedFriends = findSubject(updatedSupp, 'Friends');
  const remainingThreadCards = updatedFriends.cards.filter(c => c.stackGroup === threadKey || c.threadId === threadKey);
  assert.equal(remainingThreadCards.length, 0, 'All thread cards must be removed from active cards list');

  // Verification 2: All thread cards moved to Archive > Friends
  const archiveCat = findCategory(updatedCategories, 'Archive');
  const archiveFriends = findSubject(archiveCat, 'Friends');
  assert.ok(archiveFriends, 'Archive > Friends subject must exist');

  for (const card of initialThreadCards) {
    const foundInArchive = archiveFriends.cards.find(c => c.createdDate === card.createdDate);
    assert.ok(foundInArchive, `Card "${card.text.slice(0, 30)}" must be in Archive > Friends`);
    assert.equal(foundInArchive.archived, true, 'Card in archive must have archived: true');
    assert.equal(foundInArchive.userArchived, true, 'Card in archive must have userArchived: true');
  }
  assert.equal(archivedCards.length, initialThreadCards.length, 'Reported archivedCards count should match thread size');
});

runTest('2.2 Archiving parent prayer "Thiggy" moves entire thread to Archive and clears it from My Guys', () => {
  const data = loadBackupData();
  const supp = findCategory(data.Categories, 'Supplication');
  const myGuys = findSubject(supp, 'My Guys');
  const thiggyRoot = myGuys.cards.find(c => c.text.includes('Thiggy'));
  const threadKey = thiggyRoot.stackGroup || thiggyRoot.threadId;
  const initialThreadCards = myGuys.cards.filter(c => c.stackGroup === threadKey || c.threadId === threadKey);

  const { updatedCategories } = moveCardsToArchive(data.Categories, 'My Guys', thiggyRoot);

  const updatedSupp = findCategory(updatedCategories, 'Supplication');
  const updatedMyGuys = findSubject(updatedSupp, 'My Guys');
  const remaining = updatedMyGuys.cards.filter(c => c.stackGroup === threadKey || c.threadId === threadKey);
  assert.equal(remaining.length, 0, 'No Thiggy cards should remain in My Guys');

  const archiveCat = findCategory(updatedCategories, 'Archive');
  const archiveMyGuys = findSubject(archiveCat, 'My Guys');
  for (const card of initialThreadCards) {
    assert.ok(archiveMyGuys.cards.some(c => c.createdDate === card.createdDate), 'Thread card moved to Archive');
  }
});

// -----------------------------------------------------------------------------
// Suite 3: Archiving a standalone prayer
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}Suite 3: Archiving a standalone prayer (e.g. Dash, Wyatt Ruiz)${RESET}`);

runTest('3.1 Archiving standalone prayer "Dash" moves it to Archive and removes it from active cards', () => {
  const data = loadBackupData();
  const supp = findCategory(data.Categories, 'Supplication');
  const myGuys = findSubject(supp, 'My Guys');
  const dashCard = myGuys.cards.find(c => c.text.includes('Dash'));
  assert.ok(dashCard, 'Dash standalone card should exist');
  assert.equal(dashCard.archived, false, 'Dash card is currently active (archived: false)');

  const initialCount = myGuys.cards.length;
  const { updatedCategories, archivedCards } = moveCardsToArchive(data.Categories, 'My Guys', dashCard);

  // Active subject check
  const updatedSupp = findCategory(updatedCategories, 'Supplication');
  const updatedMyGuys = findSubject(updatedSupp, 'My Guys');
  assert.equal(updatedMyGuys.cards.length, initialCount - 1, 'My Guys should have 1 fewer card');
  assert.ok(!updatedMyGuys.cards.some(c => c.createdDate === dashCard.createdDate), 'Dash must be removed from My Guys active cards');

  // Archive check
  const archiveCat = findCategory(updatedCategories, 'Archive');
  const archiveMyGuys = findSubject(archiveCat, 'My Guys');
  assert.ok(archiveMyGuys, 'Archive > My Guys must exist');
  const archivedDash = archiveMyGuys.cards.find(c => c.createdDate === dashCard.createdDate);
  assert.ok(archivedDash, 'Dash must exist in Archive > My Guys');
  assert.equal(archivedDash.archived, true, 'archived must be true');
  assert.equal(archivedDash.userArchived, true, 'userArchived must be true');
  assert.equal(archivedDash.originalCategory, 'Supplication');
  assert.equal(archivedDash.originalSubject, 'My Guys');
  assert.equal(archivedCards.length, 1);
});

runTest('3.2 Archiving standalone prayer card (e.g. Wyatt Ruiz card or single request in Church preparation)', () => {
  const data = loadBackupData();
  const supp = findCategory(data.Categories, 'Supplication');
  const church = findSubject(supp, 'Church preparation');
  assert.ok(church && church.cards.length > 0, 'Church preparation cards should exist');
  const singlePrayer = church.cards[0];

  const { updatedCategories } = moveCardsToArchive(data.Categories, 'Church preparation', singlePrayer);

  const updatedChurch = findSubject(findCategory(updatedCategories, 'Supplication'), 'Church preparation');
  assert.ok(!updatedChurch.cards.some(c => c.createdDate === singlePrayer.createdDate), 'Single prayer removed from Church preparation');

  const archiveCat = findCategory(updatedCategories, 'Archive');
  const archiveChurch = findSubject(archiveCat, 'Church preparation');
  assert.ok(archiveChurch.cards.some(c => c.createdDate === singlePrayer.createdDate), 'Moved into Archive > Church preparation');
});

// -----------------------------------------------------------------------------
// Suite 4: Adding a sub-prayer to a person while praying
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}Suite 4: Adding a sub-prayer to a person while praying${RESET}`);

runTest('4.1 Adding a sub-prayer to a standalone person (Dash) groups them with shared stackGroup & threadId and parent becomes root container (archived: true)', () => {
  const data = loadBackupData();
  const supp = findCategory(data.Categories, 'Supplication');
  const myGuys = findSubject(supp, 'My Guys');
  const dashCard = myGuys.cards.find(c => c.text.includes('Dash'));
  assert.ok(dashCard, 'Dash standalone card exists');

  const subPrayerText = 'Praying for his exam this Friday and peace of mind';
  const { updatedCategories, newCard } = addCardUpdate(data.Categories, 'My Guys', dashCard, subPrayerText);

  assert.ok(newCard, 'newCard should be returned');
  assert.equal(newCard.text, subPrayerText);
  assert.equal(newCard.archived, false, 'New sub-prayer must be active (archived: false)');

  // Verify subject cards
  const updatedMyGuys = findSubject(findCategory(updatedCategories, 'Supplication'), 'My Guys');
  const updatedDashParent = updatedMyGuys.cards.find(c => c.createdDate === dashCard.createdDate);
  const addedSubCard = updatedMyGuys.cards.find(c => c.createdDate === newCard.createdDate);

  assert.ok(updatedDashParent, 'Parent Dash card still in My Guys');
  assert.ok(addedSubCard, 'New sub-prayer card in My Guys');

  // Verify parent card became root container (archived: true)
  assert.equal(updatedDashParent.archived, true, 'Parent card must become root container with archived: true');

  // Verify shared stackGroup and threadId
  assert.ok(updatedDashParent.stackGroup, 'Parent must have stackGroup');
  assert.ok(updatedDashParent.threadId, 'Parent must have threadId');
  assert.equal(updatedDashParent.stackGroup, addedSubCard.stackGroup, 'Parent and sub-prayer must share stackGroup');
  assert.equal(updatedDashParent.threadId, addedSubCard.threadId, 'Parent and sub-prayer must share threadId');
});

runTest('4.2 Adding an additional sub-prayer to an existing multi-update thread (Luke Larco) preserves grouping', () => {
  const data = loadBackupData();
  const supp = findCategory(data.Categories, 'Supplication');
  const friends = findSubject(supp, 'Friends');
  const lukeRoot = friends.cards.find(c => c.text === 'Luke Larco');
  assert.ok(lukeRoot);

  const initialLukeCards = friends.cards.filter(c => c.stackGroup === lukeRoot.stackGroup || c.threadId === lukeRoot.threadId);
  const newUpdateText = 'Wisdom in summer missions decision';

  const { updatedCategories, newCard } = addCardUpdate(data.Categories, 'Friends', lukeRoot, newUpdateText);
  assert.ok(newCard);

  const updatedFriends = findSubject(findCategory(updatedCategories, 'Supplication'), 'Friends');
  const updatedLukeCards = updatedFriends.cards.filter(c => c.stackGroup === lukeRoot.stackGroup || c.threadId === lukeRoot.threadId);

  assert.equal(updatedLukeCards.length, initialLukeCards.length + 1, 'Thread card count increased by 1');
  assert.equal(newCard.stackGroup, lukeRoot.stackGroup, 'Shared stackGroup preserved');
  assert.equal(newCard.threadId, lukeRoot.threadId, 'Shared threadId preserved');
  assert.equal(newCard.archived, false, 'New sub-prayer is active');

  const rootInUpdated = updatedFriends.cards.find(c => c.createdDate === lukeRoot.createdDate);
  assert.equal(rootInUpdated.archived, true, 'Root card remains container with archived: true');
});

// -----------------------------------------------------------------------------
// Suite 5: Adding a new prayer to a topic
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}Suite 5: Adding a new prayer to a topic${RESET}`);

runTest('5.1 Adding a new prayer to a topic appends it to subject cards list', () => {
  const data = loadBackupData();
  const supp = findCategory(data.Categories, 'Supplication');
  const myGuys = findSubject(supp, 'My Guys');
  const initialCount = myGuys.cards.length;

  const newPrayerText = 'Sam - hunger for Scripture and small group participation';
  const { updatedCategories, newCard } = addNewCard(data.Categories, 'My Guys', newPrayerText);

  assert.ok(newCard, 'New prayer card returned');
  assert.equal(newCard.text, newPrayerText);
  assert.equal(newCard.archived, false, 'New prayer is active (archived: false)');
  assert.equal(newCard.seenCount, 0);

  const updatedMyGuys = findSubject(findCategory(updatedCategories, 'Supplication'), 'My Guys');
  assert.equal(updatedMyGuys.cards.length, initialCount + 1, 'My Guys cards count increased by 1');
  const added = updatedMyGuys.cards.find(c => c.text === newPrayerText);
  assert.ok(added, 'Added card found in subject cards');
  assert.equal(added.createdDate, newCard.createdDate);
});

runTest('5.2 Adding empty or whitespace text does not add a card', () => {
  const data = loadBackupData();
  const { updatedCategories, newCard } = addNewCard(data.Categories, 'My Guys', '   ');
  assert.equal(newCard, null);
  assert.equal(updatedCategories, data.Categories);
});

// -----------------------------------------------------------------------------
// Suite 6: Unarchiving a card from Archive
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}Suite 6: Unarchiving a card from Archive category${RESET}`);

runTest('6.1 Unarchiving an archived sub-prayer restores it to original category and subject with active flags', () => {
  const data = loadBackupData();
  const supp = findCategory(data.Categories, 'Supplication');
  const friends = findSubject(supp, 'Friends');
  const lukeRoot = friends.cards.find(c => c.text === 'Luke Larco');
  const lukeThreadKey = lukeRoot.stackGroup || lukeRoot.threadId;
  const updateToArchive = friends.cards.find(c => (c.stackGroup === lukeThreadKey || c.threadId === lukeThreadKey) && c !== lukeRoot);

  // Step 1: Archive it
  const { updatedCategories: catArchived } = moveCardsToArchive(data.Categories, 'Friends', updateToArchive);
  const archiveFriends = findSubject(findCategory(catArchived, 'Archive'), 'Friends');
  const cardInArchive = archiveFriends.cards.find(c => c.createdDate === updateToArchive.createdDate);
  assert.ok(cardInArchive, 'Card must be in Archive before unarchiving');

  // Step 2: Unarchive it
  const { updatedCategories: catRestored, restoredCard } = unarchiveCard(catArchived, 'Friends', cardInArchive);

  // Verification in Archive: card removed
  const finalArchiveFriends = findSubject(findCategory(catRestored, 'Archive'), 'Friends');
  assert.ok(!finalArchiveFriends.cards.some(c => c.createdDate === cardInArchive.createdDate), 'Card must be removed from Archive');

  // Verification in original Subject: card restored
  const finalFriends = findSubject(findCategory(catRestored, 'Supplication'), 'Friends');
  const restoredInSubject = finalFriends.cards.find(c => c.createdDate === cardInArchive.createdDate);
  assert.ok(restoredInSubject, 'Card must be restored back into Supplication > Friends');
  assert.equal(restoredInSubject.archived, false, 'Restored card must have archived: false');
  assert.equal(restoredInSubject.userArchived, false, 'Restored card must have userArchived: false');
  assert.equal(restoredInSubject.archivedDate, undefined, 'Restored card must have archivedDate: undefined');
  assert.equal(restoredCard.archived, false);
});

runTest('6.2 Unarchiving an archived standalone prayer (Dash) restores it back to My Guys as active', () => {
  const data = loadBackupData();
  const dashCard = findSubject(findCategory(data.Categories, 'Supplication'), 'My Guys').cards.find(c => c.text.includes('Dash'));

  // Step 1: Archive Dash
  const { updatedCategories: catArchived } = moveCardsToArchive(data.Categories, 'My Guys', dashCard);
  const archivedDash = findSubject(findCategory(catArchived, 'Archive'), 'My Guys').cards.find(c => c.createdDate === dashCard.createdDate);
  assert.ok(archivedDash);

  // Step 2: Unarchive Dash
  const { updatedCategories: catRestored, restoredCard } = unarchiveCard(catArchived, 'My Guys', archivedDash);

  // Verification
  const archiveMyGuys = findSubject(findCategory(catRestored, 'Archive'), 'My Guys');
  assert.ok(!archiveMyGuys.cards.some(c => c.createdDate === dashCard.createdDate), 'Dash removed from Archive');

  const finalMyGuys = findSubject(findCategory(catRestored, 'Supplication'), 'My Guys');
  const restoredDashInMyGuys = finalMyGuys.cards.find(c => c.createdDate === dashCard.createdDate);
  assert.ok(restoredDashInMyGuys, 'Dash restored in My Guys');
  assert.equal(restoredDashInMyGuys.archived, false, 'Dash is active again');
  assert.equal(restoredDashInMyGuys.userArchived, false);
});

// -----------------------------------------------------------------------------
// Suite 7: Full Realistic Prayer Session Lifecycle Flow
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}Suite 7: Full Realistic Prayer Session Lifecycle Flow${RESET}`);

runTest('7.1 Realistic end-to-end flow: Add person -> Pray -> Add sub-prayer -> Archive sub-prayer -> Unarchive', () => {
  let categories = loadBackupData().Categories;

  // 1. User adds a new person prayer to "My Guys"
  const step1 = addNewCard(categories, 'My Guys', 'Jordan - coworker');
  categories = step1.updatedCategories;
  const jordanCard = step1.newCard;
  assert.ok(jordanCard);
  assert.equal(jordanCard.archived, false);

  // 2. While praying, user adds a sub-prayer for Jordan
  const step2 = addCardUpdate(categories, 'My Guys', jordanCard, 'Open doors to share the gospel over lunch');
  categories = step2.updatedCategories;
  const subPrayer1 = step2.newCard;
  assert.ok(subPrayer1);

  // Verify Jordan parent became root container (archived: true) and sub-prayer is active
  const myGuysCards1 = findSubject(findCategory(categories, 'Supplication'), 'My Guys').cards;
  const jordanParent = myGuysCards1.find(c => c.createdDate === jordanCard.createdDate);
  assert.equal(jordanParent.archived, true, 'Jordan parent is archived: true');
  assert.equal(subPrayer1.archived, false, 'Sub-prayer 1 is active');
  assert.equal(jordanParent.stackGroup, subPrayer1.stackGroup, 'Shared stackGroup');

  // 3. User adds a 2nd sub-prayer for Jordan
  const step3 = addCardUpdate(categories, 'My Guys', jordanParent, 'Comfort after grandmother passing');
  categories = step3.updatedCategories;
  const subPrayer2 = step3.newCard;
  assert.ok(subPrayer2);

  // 4. Later, the gospel lunch happened! User archives sub-prayer 1
  const step4 = moveCardsToArchive(categories, 'My Guys', subPrayer1);
  categories = step4.updatedCategories;

  // Verify sub-prayer 1 is in Archive with originalTopic "Jordan - coworker"
  const archiveMyGuys = findSubject(findCategory(categories, 'Archive'), 'My Guys');
  const archivedSub1 = archiveMyGuys.cards.find(c => c.createdDate === subPrayer1.createdDate);
  assert.ok(archivedSub1);
  assert.equal(archivedSub1.userArchived, true);
  assert.equal(archivedSub1.originalTopic, 'Jordan - coworker');

  // Verify Jordan parent & sub-prayer 2 remain in My Guys
  const myGuysCards2 = findSubject(findCategory(categories, 'Supplication'), 'My Guys').cards;
  assert.ok(myGuysCards2.some(c => c.createdDate === jordanParent.createdDate && c.text === jordanParent.text), 'Parent remains in My Guys');
  assert.ok(myGuysCards2.some(c => c.createdDate === subPrayer2.createdDate && c.text === subPrayer2.text), 'Sub-prayer 2 remains in My Guys');
  assert.ok(!myGuysCards2.some(c => c.createdDate === subPrayer1.createdDate && c.text === subPrayer1.text), 'Sub-prayer 1 removed from My Guys');

  // 5. User accidentally archived sub-prayer 1, so they unarchive it back
  const step5 = unarchiveCard(categories, 'My Guys', archivedSub1);
  categories = step5.updatedCategories;

  const myGuysCards3 = findSubject(findCategory(categories, 'Supplication'), 'My Guys').cards;
  const unarchivedSub1 = myGuysCards3.find(c => c.createdDate === subPrayer1.createdDate && c.text === subPrayer1.text);
  assert.ok(unarchivedSub1, 'Sub-prayer 1 restored back to My Guys');
  assert.equal(unarchivedSub1.archived, false);
  assert.equal(unarchivedSub1.userArchived, false);

  const archiveMyGuysFinal = findSubject(findCategory(categories, 'Archive'), 'My Guys');
  assert.ok(!archiveMyGuysFinal.cards.some(c => c.createdDate === subPrayer1.createdDate && c.text === subPrayer1.text), 'Sub-prayer 1 removed from Archive');
});

console.log(`\n${CYAN}Suite 8: Permanently deleting from Archive altogether${RESET}`);

runTest('8.1 Permanently deleting an individual card from Archive removes it completely', () => {
  let categories = loadBackupData().Categories;
  const myGuys = findSubject(findCategory(categories, 'Supplication'), 'My Guys');
  const cardToArchive = myGuys.cards[0];
  
  // First archive it into Archive category
  const archResult = moveCardsToArchive(categories, 'My Guys', cardToArchive);
  categories = archResult.updatedCategories;

  const archiveCat = findCategory(categories, 'Archive');
  const targetSub = archiveCat.subjects.find(s => s.cards.length > 0);
  assert.ok(targetSub, 'Archive should have a subject with cards');

  const cardToDelete = targetSub.cards[0];
  const originalCount = targetSub.cards.length;

  const result = deleteArchivedCard(categories, targetSub.name, cardToDelete);
  const updatedArchive = findCategory(result.updatedCategories, 'Archive');
  const updatedSub = findSubject(updatedArchive, targetSub.name);

  assert.equal(updatedSub.cards.length, originalCount - 1, 'Card count reduced by 1');
  assert.ok(!updatedSub.cards.some(c => c.createdDate === cardToDelete.createdDate && c.text === cardToDelete.text), 'Card permanently deleted');
});

runTest('8.2 Permanently deleting an entire topic from Archive removes the topic and all its cards', () => {
  let categories = loadBackupData().Categories;
  const myGuys = findSubject(findCategory(categories, 'Supplication'), 'My Guys');
  const cardToArchive = myGuys.cards[0];
  
  // First archive it into Archive category
  const archResult = moveCardsToArchive(categories, 'My Guys', cardToArchive);
  categories = archResult.updatedCategories;

  const archiveCat = findCategory(categories, 'Archive');
  const targetSub = archiveCat.subjects.find(s => s.cards.length > 0);
  assert.ok(targetSub, 'Archive should have a subject to delete');

  const result = deleteArchivedSubject(categories, targetSub.name);
  const updatedArchive = findCategory(result.updatedCategories, 'Archive');
  assert.ok(!updatedArchive.subjects.some(s => s.name === targetSub.name), 'Topic removed from Archive completely');
});

console.log(`\n${BOLD}${GREEN}====================================================${RESET}`);
console.log(`${BOLD}${GREEN}   All ${passedTests}/${totalTests} Tests Passed Successfully (100%)!   ${RESET}`);
console.log(`${BOLD}${GREEN}====================================================${RESET}\n`);
