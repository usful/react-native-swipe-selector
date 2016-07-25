/**
 * Returns a number bounded by an upper and lower value
 * @param {number} num
 * @param {{upper: number, lower: number}} bounds
 * @returns {number}
 */
function bound (num, bounds){
  return Math.max(bounds.lower, Math.min(bounds.upper, num));
}

/**
 * Returns a generator that runs through [start, end) with an increment of size step (default of 1)
 * @param {number} start
 * @param {number} end
 * @param {number} [step=1]
 */
function* range (start, end, step = 1) {

  current = start;
  while (current < end) {
    yield current;
    current += step;
  }

}

/**
 * Wraps an array in a generator to emulate a circular array
 * Does not clone the array, only references the original array
 * It is advised that you do not alter the array while iterating over it.
 * @param {Array} array
 * @param {number} [currentIndex=0]
 * @param {boolean} [bounded=false]
 */
function* circularize (array, currentIndex = 0, bounded = false) {
  
  let distance = 0;
  while (!bounded || (bounded && distance < array.length)) {
    if (currentIndex >= array.length)
      currentIndex = currentIndex % array.length;
    yield array[currentIndex];
    currentIndex++;
    distance++;
  }
}