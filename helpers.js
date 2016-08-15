"use strict";

/**
 * Returns whether num exists on (bound1, bound2)
 *  The order of bound1 and bound2 is irrelevant.
 * @param {number} num
 * @param {number} bound1
 * @param {number} bound2
 * @returns {boolean}
 */
function between (num, bound1, bound2) {
  return Math.min(bound1, bound2) < num && num < Math.max(bound1, bound2);
}

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
 * Returns a generator that runs through [start, end) (non-inclusive) with an increment of size step (default of 1)
 * Similar to Python xrange function
 * @param {number} start the first number
 * @param {number} end
 * @param {number} [step=1]
 */
function* range (start, end, step = 1) {

  let current = start;
  // The condition enables the use of range(1,2,1) or range (2,1,-1)
  while (between(current, start, end) || (current === start && current !== end)) {
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
  if (!array)
    return;

  while (!bounded || (bounded && distance < array.length)) {
    if (currentIndex >= array.length)
      currentIndex = currentIndex % array.length;
    yield array[currentIndex];
    currentIndex++;
    distance++;
  }
}

function _isPrimitive (val) {
  return typeof val === 'number'
    || typeof val === 'boolean'
    || typeof val === 'string'
    || typeof val === 'symbol';
}

function _generateOwnKeyList (obj) {
  let set = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key))
      set.push(key)
  }
  return set;
}

/**
 * This is not cyclic safe. If you pass it a cyclic object, it will create
 *  a stack overflow.
 * @param {object} obj1
 * @param {object} obj2
 * @param {[string]} ignoreKeys
 * @returns {boolean}
 */
function deepCompare (obj1, obj2, ignoreKeys = []){

  let isPrimitive = _isPrimitive;

  if (obj1 !== obj2) {
    let keys1 = _generateOwnKeyList(obj1);
    let keys2 = _generateOwnKeyList(obj2);
    keys1 = keys1.filter( key => ignoreKeys.indexOf(key) === -1);
    keys2 = keys2.filter( key => ignoreKeys.indexOf(key) === -1);
    keys1.sort();
    keys2.sort();

    if (keys1.length !== keys2.length || keys1.some( (e, ix) => e !== keys2[ix]))
      return false;


    for (let key of keys1) {
      let prop1 = obj1[key];
      let prop2 = obj2[key];

      if (typeof prop1 === 'object' && prop1 !== null) prop1 = prop1.valueOf();
      if (typeof prop2 === 'object' && prop2 !== null) prop2 = prop2.valueOf();

      if (typeof prop1 === 'function' || typeof prop2 === 'function') continue;

      if (isPrimitive(prop1) || isPrimitive(prop2)) {
        if (prop1 !== prop2)
          return false;

        continue;
      }
      else {
        if (!deepCompare(prop1, prop2, ignoreKeys))
          return false;

        continue;
      }
    }
  }

  return true;
}

export {between, bound, circularize, deepCompare, range}