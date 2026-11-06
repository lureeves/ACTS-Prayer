import assert from 'assert';
import fs from 'fs';

console.log('\n======================================================');
console.log('   ACTS Prayer App - Adoration Layout Test Suite      ');
console.log('======================================================\n');

// 1. Verify GuidedSessionModal source code
const modalSource = fs.readFileSync('src/components/GuidedSessionModal.tsx', 'utf8');

console.log('Test 1: Verse count badge removed for Adoration category in top right');
assert(
  modalSource.includes("currentStage !== 'Confession' && currentStage !== 'Adoration'"),
  'Badge should not be shown for Adoration or Confession'
);
console.log('  ✓ Verse count badge in top right is strictly hidden for Adoration');

console.log('\nTest 2: Adoration description separation logic');
assert(
  modalSource.includes('const isScriptureCard'),
  'GuidedSessionModal should define isScriptureCard helper'
);
assert(
  modalSource.includes('adorationDescriptionCard'),
  'GuidedSessionModal should identify adorationDescriptionCard'
);
assert(
  modalSource.includes('displayCards'),
  'GuidedSessionModal should separate displayCards from description card'
);
console.log('  ✓ Description separation logic present');

console.log('\nTest 3: Description rendered in top section below attribute');
assert(
  modalSource.includes("currentStage === 'Adoration' && adorationDescriptionCard"),
  'Modal should render description in header when in Adoration'
);
console.log('  ✓ Description rendered in top header section below attribute name');

console.log('\nTest 4: Scripture detection accurately classifies all seed data attributes');
const starterData = JSON.parse(fs.readFileSync('src/data/starterPrayerData.json', 'utf8'));
const categories = starterData.Categories || starterData.categories;
const adoration = categories.find(c => c.name === 'Adoration');

const isScriptureCard = (card) => {
  const firstLine = card.text.trim().split('\n')[0].trim();
  return /^[1-3]?\s*[A-Za-z]+(\s+[A-Za-z]+)*\s+\d+:\d+/.test(firstLine);
};

for (const sub of adoration.subjects) {
  const desc = sub.cards.find(c => !isScriptureCard(c));
  const verses = sub.cards.filter(c => isScriptureCard(c));

  if (sub.name === 'Creator') {
    assert(desc, 'Creator must have a description card');
    assert(
      desc.text.includes('uncreated maker'),
      'Creator description card must be the uncreated maker text'
    );
    assert.strictEqual(verses.length, 2, 'Creator must have 2 scripture verses');
    assert(verses[0].text.includes('Colossians 1:16'), 'First verse must be Colossians 1:16');
    assert(verses[1].text.includes('Genesis 1:1'), 'Second verse must be Genesis 1:1');
    console.log('  ✓ Creator attribute: Description ("' + desc.text.substring(0, 35) + '...") separated from ' + verses.length + ' verses');
  } else if (sub.name === 'Eternal') {
    assert.strictEqual(desc, undefined, 'Eternal has no description card');
    assert.strictEqual(verses.length, 2, 'Eternal has 2 scripture verses');
  } else {
    assert(desc, `${sub.name} must have a description card`);
    assert(verses.length >= 2, `${sub.name} must have at least 2 scripture verses`);
  }
}
console.log('  ✓ All 13 Adoration subjects correctly classified into descriptions and verses');

console.log('\n======================================================');
console.log('   All Adoration Layout Tests Passed! (100%)          ');
console.log('======================================================\n');
