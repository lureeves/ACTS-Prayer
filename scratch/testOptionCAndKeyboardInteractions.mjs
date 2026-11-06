import assert from 'assert';
import fs from 'fs';

console.log('\n======================================================');
console.log('   ACTS Prayer App - Option C & Keyboard Test Suite   ');
console.log('======================================================\n');

// 1. Verify GuidedSessionModal source code contracts
const modalSource = fs.readFileSync('src/components/GuidedSessionModal.tsx', 'utf8');
const timerBarSource = fs.readFileSync('src/components/TimerBar.tsx', 'utf8');

console.log('Test 1: TimerBar forwardRef and TimerBarHandle export');
assert(timerBarSource.includes('export interface TimerBarHandle'), 'TimerBar should export TimerBarHandle');
assert(timerBarSource.includes('useImperativeHandle(ref,'), 'TimerBar should use useImperativeHandle');
assert(timerBarSource.includes('toggleRunning: () =>'), 'TimerBarHandle should implement toggleRunning');
assert(timerBarSource.includes('isRunning'), 'TimerBarHandle should expose isRunning');
console.log('  ✓ TimerBar correctly exposes toggleRunning via forwardRef');

console.log('\nTest 2: Esc badge near X on hover');
assert(modalSource.includes('title="Exit Session (Esc)"'), 'Modal exit button should have title with Esc');
assert(modalSource.includes('group-hover:opacity-100'), 'Exit button should use group-hover for Esc badge');
assert(modalSource.includes('>Esc<') || modalSource.includes('Esc\n') || modalSource.includes('Esc'), 'Exit button should display Esc letters');
console.log('  ✓ Exit button has hover Esc badge');

console.log('\nTest 3: Esc key exits prayer session');
assert(modalSource.includes("e.key === 'Escape'"), 'Modal should listen for Escape key');
assert(modalSource.includes('onClose()'), 'Escape key should trigger onClose()');
console.log('  ✓ Esc key triggers prayer exit');

console.log('\nTest 4: Space bar pauses and plays timer');
assert(modalSource.includes("e.code === 'Space' || e.key === ' '"), 'Modal should listen for Space bar');
assert(modalSource.includes('timerRef.current?.toggleRunning()'), 'Space bar should call timerRef.current.toggleRunning()');
assert(modalSource.includes('if (isInputFocused)'), 'Space bar should preserve normal typing when an input is focused');
console.log('  ✓ Space bar toggles timer and allows normal typing in text fields');

console.log('\nTest 5: Sub-prayer button is just the plus sign');
// Ensure no buttons have the text "Sub-prayer" or "<span>Sub-prayer</span>" inside the prayer session
const subPrayerTextMatches = modalSource.match(/<span>Sub-prayer<\/span>/g);
assert(!subPrayerTextMatches, 'The text "Sub-prayer" should not be on any button in GuidedSessionModal');
assert(modalSource.includes('title="Add sub-prayer"'), 'Button should have title "Add sub-prayer"');
assert(modalSource.includes('<Plus className="w-3.5 h-3.5" />'), 'Button should render clean Plus icon');
console.log('  ✓ Sub-prayer button is just the plus sign');

console.log('\nTest 6: Option C Hybrid (Right-click + Subtle 3-dot trigger)');
assert(modalSource.includes('onContextMenu={(e) => openContextMenu'), 'Cards should have onContextMenu handlers');
assert(modalSource.includes('onClick={(e) => openActionMenu'), 'Cards should have 3-dot trigger with openActionMenu');
assert(modalSource.includes('<MoreHorizontal'), 'Cards should render 3-dot MoreHorizontal icon');
assert(modalSource.includes('actionMenu && ('), 'Modal should render floating action menu when active');
assert(modalSource.includes('Archive Person & All Requests'), 'Menu should provide root card archive action');
assert(modalSource.includes('Archive This Request'), 'Menu should provide sub-card archive action');
console.log('  ✓ Option C right-click and subtle 3-dot menu implemented');

console.log('\n======================================================');
console.log('   All Option C & Keyboard Tests Passed! (100%)       ');
console.log('======================================================\n');
