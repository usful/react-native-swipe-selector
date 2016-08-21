"use strict";

import {range} from './helpers';
import {inverseFunc} from './scalers'

/**
 * Encapsulates an interpolation map, with the input range and the calculated output range
 * The output range is stored in a valueLabel set when the map is calculated.
 * @name InterpolationMap
 * @type { {inputRange: [number], [valueLabel]: {inputRange: [number], outputRange: [number] } } }
 */

/**
 * Encapsulates a 2D interpolation map, with the input range and the calculated output range.
 * @name Interpolation2DMap
 * @type { {inputRange: [number], x: {inputRange: [number], outputRange: [number] }, y: {inputRange: [number], outputRange: [number] } } }
 */


/**
 * Calculates an interpolation map. The valueLabel parameter determines what
 *  property to store the resulting outputRange
 * @param {Bounds} bounds
 * @param {number} rightCount Item count on the right
 * @param {number} leftCount Item count on the left
 * @param {number} hiddenCount Item count on hidden arm
 * @param {string} [valueLabel="x"] The property label to access data in bounds and store it in the resulting object
 * @returns {InterpolationMap}
 */
function calculateInterpolationMap (bounds, rightCount, leftCount, hiddenCount = 0, valueLabel = 'x') {
  let inputRange = []; // Bound for convenience and as a sanity check
  let outputRange = { [valueLabel] : []};
  let inverseLeft = () => {};
  let inverseRight = () => {};

  let rightArm, hiddenArm, leftArm;
  let rightOutputArm, hiddenOutputArm, leftOutputArm;
  // Calculate the stopping points and vanishing points (w/ padding) with which to sample the functions
  {
    let nextIndex = 0;

    let rightMaxIndex = rightCount + bounds.right.padPoints;
    rightArm = Array.from(range(nextIndex, rightMaxIndex + 1));
    let rightVanishingIndex = rightMaxIndex  + bounds.right.vanishingGap;
    rightArm.push(rightVanishingIndex);
    nextIndex = rightMaxIndex + 1;

    hiddenArm = Array.from(range(nextIndex, nextIndex + hiddenCount));
    nextIndex = nextIndex + hiddenCount;

    let leftMaxIndex = (nextIndex-1) + bounds.left.padPoints + leftCount;
    leftArm = Array.from(range(nextIndex, leftMaxIndex + 1));
    let leftVanishingIndex = nextIndex - bounds.left.vanishingGap;
    leftArm.unshift(leftVanishingIndex);
    nextIndex = leftMaxIndex + 1;

    leftArm.push(nextIndex); // for final transition back to 0th state
  }


  // Sample the function and build the output points

  // Proceed up the right arm first
  let rightSample = bounds.right.interpolate(
    {
      start: rightArm[0],
      end: rightArm[rightArm.length-1]
    },
    {
      start: bounds.center[valueLabel],
      end: bounds.right[valueLabel]
    },
    bounds.right.interpolateDepth
  );

  for (let loc of rightArm) {
    inputRange.push(loc);
    outputRange[valueLabel].push(rightSample(loc));
  }

  // Proceed through the hidden arm

  let hiddenSample = bounds.hidden.interpolate(
    {
      start: hiddenArm[0],
      end: hiddenArm[hiddenArm.length-1]
    },
    {
      start: bounds.right[valueLabel],
      end: bounds.left[valueLabel]
    },
    bounds.hidden.interpolateDepth
  );

  for (let loc of hiddenArm) {
    inputRange.push(loc);
    outputRange[valueLabel].push(hiddenSample(loc));
  }

  // Proceed down the left arm last

  let leftSample = bounds.left.interpolate(
    {
      start: leftArm[leftArm.length-1],
      end: leftArm[0]
    },
    {
      start: bounds.center[valueLabel],
      end: bounds.left[valueLabel]
    },
    bounds.left.interpolateDepth
  );

  for (let loc of leftArm) {
    inputRange.push(loc);
    outputRange[valueLabel].push(leftSample(loc));
  }



  // strip out the padded points and recalculate the input range
  inputRange = [];
  {
    let nextIndex = 0;

    let rightMaxIndex = rightCount;
    rightOutputArm = Array.from(range(nextIndex, rightMaxIndex + 1));
    let rightVanishingIndex = rightMaxIndex  + bounds.right.vanishingGap;
    rightOutputArm.push(rightVanishingIndex);
    nextIndex = rightMaxIndex + 1;

    hiddenOutputArm = Array.from(range(nextIndex, nextIndex + hiddenCount));
    nextIndex = nextIndex + hiddenCount;

    let leftMaxIndex = rightMaxIndex + leftCount;
    leftOutputArm = Array.from(range(nextIndex, leftMaxIndex + 1));
    let leftVanishingIndex = nextIndex - bounds.left.vanishingGap;
    leftOutputArm.unshift(leftVanishingIndex);
    nextIndex = leftMaxIndex + 1;

    leftOutputArm.push(nextIndex); // for final transition back to 0th state

    inputRange = [].concat(rightOutputArm, hiddenOutputArm, leftOutputArm);
  }

  let removePadding = (outputArr) => {
    outputArr.splice(rightCount + 1, bounds.right.padPoints);
    outputArr.reverse();
    outputArr.splice(leftCount + 1, bounds.left.padPoints);
    outputArr.reverse();
  };
  removePadding(outputRange[valueLabel]);

  // Recalculate rightArm and leftArm to be the actual values in the input range
  rightArm = inputRange.slice(0, rightCount + 2);
  rightOutputArm = outputRange[valueLabel].slice(0, rightCount + 2);
  inputRange.reverse();
  outputRange[valueLabel].reverse();
  leftArm = inputRange.slice(0, leftCount + 2);
  leftOutputArm = outputRange[valueLabel].slice(0, leftCount + 2);
  inputRange.reverse();
  outputRange[valueLabel].reverse();

  inverseRight = inverseFunc(rightArm, rightOutputArm);
  inverseLeft = inverseFunc(leftArm, leftOutputArm);

  return {
    inputRange: inputRange,
    [valueLabel]: {
      inputRange: inputRange,
      outputRange: outputRange[valueLabel],
      inverseRight: inverseRight,
      inverseLeft: inverseLeft
    }
  };
}

/**
 * Calculates a 2D interpolation map.
 * @param {Bounds} bounds
 * @param {number} rightCount Item count on the right
 * @param {number} leftCount Item count on the left
 * @param {number} hiddenCount Item count on hidden arm
 * @returns {Interpolation2DMap}
 */
function calculate2DInterpolationMap(bounds, rightCount, leftCount, hiddenCount) {

  let xInterpolation = calculateInterpolationMap(...arguments, 'x');

  let yInterpolation = calculateInterpolationMap(...arguments, 'y');
  return {
    inputRange: xInterpolation.inputRange,
    x: { ... xInterpolation.x },
    y: { ... yInterpolation.y }
  };
}

/**
 * Windows the given output range. If the input value is within one of the provided ranges
 *  the output range will be unchanged, otherwise it is set to the default value.
 * @param {[number]} inputRange
 * @param {[number]} outputRange
 * @param {{default: number, range: [{start: number, end: number}] }} valuedInputs
 * @param {string} valueLabel
 * @returns { InterpolationMap }
 */
function interpolationWindow (inputRange, outputRange, valuedInputs, valueLabel = 'x') {
  // Changes to default for everything that is not in the closed interval of valuedInputs
  // ValuedInputs = { default: Number, range: [{start: Number , end: Number }]}

  outputRange = outputRange.map( (val, index)  => {
    let windowed = false; // By default assume not in the allowed window

    for (let range of valuedInputs.range)
      if (range.start <= inputRange[index] && inputRange[index] <= range.end)
        windowed = true;

    if (windowed)
      return val;
    return valuedInputs.default;
  });

  return {
    inputRange: inputRange,
    [valueLabel]: {inputRange: inputRange, outputRange: outputRange}
  }
}

export {calculateInterpolationMap, calculate2DInterpolationMap, interpolationWindow}