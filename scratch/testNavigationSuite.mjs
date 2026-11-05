import assert from 'node:assert/strict';

// Test gesture and navigation calculation logic
console.log('\n--- Navigation & Gesture Logic Tests ---');

// 1. Wheel Trackpad Delta calculation (Less aggressive thresholds & momentum protection)
function calculateWheelDirection(deltaX, deltaY, inCooldown = false, threshold = 95) {
  if (inCooldown) return 'none'; // cooldown completely ignores momentum inertia
  // Reject if vertical scrolling is significant
  if (Math.abs(deltaY) * 1.5 > Math.abs(deltaX)) return 'none';
  if (Math.abs(deltaX) < 10) return 'none';
  if (deltaX > threshold) return 'next'; // 2 fingers swipe left -> advance
  if (deltaX < -threshold) return 'prev'; // 2 fingers swipe right -> previous
  return 'accumulating';
}

assert.equal(calculateWheelDirection(110, 5, false), 'next', 'Intentional swipe left with 2 fingers moves to next');
assert.equal(calculateWheelDirection(-110, 5, false), 'prev', 'Intentional swipe right with 2 fingers moves to previous');
assert.equal(calculateWheelDirection(60, 5, false), 'accumulating', 'Accidental 60 delta does not prematurely trigger');
assert.equal(calculateWheelDirection(120, 5, true), 'none', 'Momentum inertia during cooldown is discarded');
assert.equal(calculateWheelDirection(10, 80, false), 'none', 'Vertical scrolling is ignored');
console.log('✓ Trackpad 2-finger wheel non-aggressive gesture detection verified');

// 2. Touch gesture calculation (Less aggressive threshold: 75px, 500ms max)
function calculateTouchSwipe(startX, startY, endX, endY, elapsed, maxTime = 500, minDistance = 75) {
  const diffX = endX - startX;
  const diffY = endY - startY;
  if (elapsed >= maxTime) return 'none';
  if (Math.abs(diffX) < minDistance) return 'none';
  if (Math.abs(diffX) <= Math.abs(diffY) * 1.6) return 'none';
  return diffX < 0 ? 'next' : 'prev';
}

assert.equal(calculateTouchSwipe(200, 100, 100, 105, 250), 'next', 'Intentional touch swipe left (100px) moves next');
assert.equal(calculateTouchSwipe(80, 100, 180, 105, 250), 'prev', 'Intentional touch swipe right (100px) moves previous');
assert.equal(calculateTouchSwipe(100, 100, 55, 105, 250), 'none', 'Sub-threshold 45px swipe is ignored');
assert.equal(calculateTouchSwipe(100, 50, 100, 250, 200), 'none', 'Vertical swipe does not trigger page change');
assert.equal(calculateTouchSwipe(200, 100, 80, 105, 700), 'none', 'Slow drag exceeding 500ms is ignored');
console.log('✓ Touchscreen non-aggressive swipe detection verified');

// 3. Keyboard Arrow filtering
function shouldHandleArrowKey(key, targetTag, isContentEditable) {
  if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || isContentEditable) {
    return false; // let user navigate text inside inputs
  }
  return key === 'ArrowRight' || key === 'ArrowLeft';
}

assert.equal(shouldHandleArrowKey('ArrowRight', 'DIV', false), true, 'ArrowRight advances when on page');
assert.equal(shouldHandleArrowKey('ArrowLeft', 'DIV', false), true, 'ArrowLeft goes back when on page');
assert.equal(shouldHandleArrowKey('ArrowRight', 'INPUT', false), false, 'ArrowRight in INPUT is not hijacked');
assert.equal(shouldHandleArrowKey('ArrowLeft', 'TEXTAREA', false), false, 'ArrowLeft in TEXTAREA is not hijacked');
assert.equal(shouldHandleArrowKey('ArrowRight', 'DIV', true), false, 'ArrowRight in contentEditable is not hijacked');
console.log('✓ Keyboard arrow filter verified');

console.log('\n--- All Navigation & Gesture Logic Tests Passed (100%)! ---\n');
