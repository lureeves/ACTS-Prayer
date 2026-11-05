import assert from 'node:assert/strict';

// Test gesture and navigation calculation logic
console.log('\n--- Navigation & Gesture Logic Tests ---');

// 1. Wheel Trackpad Delta calculation
function calculateWheelDirection(deltaX, deltaY, threshold = 45) {
  // Reject if vertical scrolling is dominant
  if (Math.abs(deltaY) > Math.abs(deltaX) * 1.4) return 'none';
  if (Math.abs(deltaX) < 6) return 'none';
  if (deltaX > threshold) return 'next'; // 2 fingers swipe left -> advance
  if (deltaX < -threshold) return 'prev'; // 2 fingers swipe right -> previous
  return 'accumulating';
}

assert.equal(calculateWheelDirection(60, 5), 'next', 'Swipe left with 2 fingers moves to next');
assert.equal(calculateWheelDirection(-60, 5), 'prev', 'Swipe right with 2 fingers moves to previous');
assert.equal(calculateWheelDirection(10, 80), 'none', 'Vertical scrolling is ignored');
assert.equal(calculateWheelDirection(20, 2), 'accumulating', 'Sub-threshold accumulates');
console.log('✓ Trackpad 2-finger wheel gesture detection verified');

// 2. Touch gesture calculation
function calculateTouchSwipe(startX, startY, endX, endY, elapsed, maxTime = 600, minDistance = 40) {
  const diffX = endX - startX;
  const diffY = endY - startY;
  if (elapsed >= maxTime) return 'none';
  if (Math.abs(diffX) < minDistance) return 'none';
  if (Math.abs(diffX) <= Math.abs(diffY) * 1.4) return 'none';
  return diffX < 0 ? 'next' : 'prev';
}

assert.equal(calculateTouchSwipe(200, 100, 80, 105, 250), 'next', 'Touch swipe left moves next');
assert.equal(calculateTouchSwipe(80, 100, 200, 105, 250), 'prev', 'Touch swipe right moves previous');
assert.equal(calculateTouchSwipe(100, 50, 100, 250, 200), 'none', 'Vertical swipe does not trigger page change');
assert.equal(calculateTouchSwipe(200, 100, 80, 105, 900), 'none', 'Slow drag exceeding 600ms is ignored');
console.log('✓ Touchscreen swipe detection verified');

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

// 4. Auto-advance remaining decrement & boundary
function tickAutoAdvance(remaining, step = 0.1) {
  if (remaining <= 0.1) {
    return { shouldAdvance: true, nextRemaining: 0 };
  }
  return { shouldAdvance: false, nextRemaining: Math.max(0, Number((remaining - step).toFixed(1))) };
}

assert.deepEqual(tickAutoAdvance(15.0), { shouldAdvance: false, nextRemaining: 14.9 });
assert.deepEqual(tickAutoAdvance(0.1), { shouldAdvance: true, nextRemaining: 0 });
console.log('✓ Auto-advance countdown tick logic verified');

console.log('\n--- All Navigation & Gesture Logic Tests Passed (100%)! ---\n');
