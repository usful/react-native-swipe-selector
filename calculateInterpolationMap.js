"use strict";

import {range} from './helpers';

//TODO: Make this more robust
function calculateInterpolationMap (bounds, rightCount, leftCount, hiddenCount = 0, valueLabel = 'x') {
  let inputRange = []; // Bound for convenience and as a sanity check
  let outputRange = { [valueLabel] : []};

  let rightArm, hiddenArm, leftArm;
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
    let rightArm = Array.from(range(nextIndex, rightMaxIndex + 1));
    let rightVanishingIndex = rightMaxIndex  + bounds.right.vanishingGap;
    rightArm.push(rightVanishingIndex);
    nextIndex = rightMaxIndex + 1;

    let hiddenArm = Array.from(range(nextIndex, nextIndex + hiddenCount));
    nextIndex = nextIndex + hiddenCount;

    let leftMaxIndex = rightMaxIndex + leftCount;
    let leftArm = Array.from(range(nextIndex, leftMaxIndex + 1));
    let leftVanishingIndex = nextIndex - bounds.left.vanishingGap;
    leftArm.unshift(leftVanishingIndex);
    nextIndex = leftMaxIndex + 1;

    leftArm.push(nextIndex); // for final transition back to 0th state

    inputRange = [].concat(rightArm, hiddenArm, leftArm);
  }

  let removePadding = (outputArr) => {
    outputArr.splice(rightCount + 1, bounds.right.padPoints);
    outputArr.reverse();
    outputArr.splice(leftCount + 1, bounds.left.padPoints);
    outputArr.reverse();
  };
  removePadding(outputRange[valueLabel]);

  console.log(valueLabel);
  return {
    inputRange: inputRange,
    [valueLabel]: {inputRange: inputRange, outputRange: outputRange[valueLabel]}
  };
}

function calculate2DInterpolationMap(bounds, rightCount, leftCount, hiddenCount) {

  let xInterpolation = calculateInterpolationMap(...arguments, 'x');

  let yInterpolation = calculateInterpolationMap(...arguments, 'y');
  console.log('xint', xInterpolation);
  console.log('yint', yInterpolation);
  return {
    inputRange: xInterpolation.inputRange,
    x: {inputRange: xInterpolation.inputRange, outputRange: xInterpolation.x.outputRange},
    y: {inputRange: xInterpolation.inputRange, outputRange: yInterpolation.y.outputRange}
  };
}

export {calculateInterpolationMap, calculate2DInterpolationMap}