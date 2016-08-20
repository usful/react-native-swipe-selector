/**
 * Returns a linear scaling function, effectively acting as a linear interpolation
 * @param inputRange {{start: number, end: number }}
 * @param outputRange {{start:number, end:number }}
 * @returns { function } Scaled mapping function
 * @private
 */
function scaleLinear(inputRange, outputRange) {

  let f = function(input) {
    // y_0 + (x-x_0)/(x_1-x_0)*(y_1-y_0)
    let scale = input => (input-inputRange.start)/(inputRange.end-inputRange.start);
    let value = scale(input);

    value = outputRange.start + value * (outputRange.end-outputRange.start);
    return value;
  };

  f.inputRange = inputRange;
  f.outputRange = outputRange;
  return f;
}

/**
 * Returns a logarithmic scaling function, maps a linear to a logarithmic scale
 * @param inputRange {{start: number, end: number }}
 * @param outputRange {{start:number, end:number }}
 * @param {number} [depth=1] How many times to apply the scaling
 * @returns { function } Scaled mapping function
 * @private
 */
function scaleLogarithmic(inputRange, outputRange, depth = 1 ) {
  // Maps a linear scale to a logarithmic scale
  // Effectively emulates dx/x for scaling perspective

  if (depth === 0)
    return scaleLinear(inputRange, outputRange);

  let ln = Math.log;
  let e = Math.exp(1);
  let exp = Math.exp;
  let ln2 = Math.log(2);
  let f = function(input) {
    // y_0 + ln (1+(e-1)*(x-x_0)/(x_1-x_0))*(y_1-y_0)
    let scale;
    let value = (input-inputRange.start)/(inputRange.end-inputRange.start);
    if (depth > 0)
      scale =  input => ln(1+(e-1)*input);
    else if (depth < 0)
      scale = input => exp(ln2*input) - 1;

    depth = Math.abs(depth);
    for (let i = 0; i < depth; i++) {
      value = scale (value);
    }

    value = outputRange.start + value * (outputRange.end-outputRange.start);
    return value;
  };
  f.inputRange = inputRange;
  f.outputRange = outputRange;
  return f;
}

/**
 * Returns a sqrt scaling function, maps a linear to a sqrt scale
 * @param inputRange {{ start: number, end: number }}
 * @param outputRange {{ start:number, end:number }}
 * @param depth {number = 1} How many times to apply the scaling
 * @returns { function } Scaled mapping function
 * @private
 */
function scaleSqrt(inputRange, outputRange, depth = 1 ) {
  // Maps a linear scale to a sqrt scale
  let sqrt = Math.sqrt;
  let sqr = num => Math.pow(num, 2);
  let f = function (input) {
    // y_0 + sqrt((x-x_0)/(x_1-x_0))*(y_1-y_0)
    let scale;
    let value = (input-inputRange.start)/(inputRange.end-inputRange.start);
    if (depth > 0)
      scale =  input => sqrt(input);
    else if (depth < 0)
      scale = input => sqr(input);

    depth = Math.abs(depth);
    for (let i = 0; i < depth; i++) {
      value = scale(value);
    }

    value = outputRange.start + value * (outputRange.end-outputRange.start);
    return value;
  };
  f.inputRange = inputRange;
  f.outputRange = outputRange;
  return f;
}

/**
 * Returns the index of the starting value of the range on which a number exists in a given array
 *  Will return -1 if the value is below all specified numbers,
 *  Will return inputRange.length - 1 (ie the end of the array) if the value is above all specified numbers
 * @param {number} input Value to search
 * @param {[number]} inputRange Monotonically increasing array of numbers
 * @returns {number}
 * @private
 */
function _findRange(input, inputRange) {
  let ix = inputRange.findIndex( e => input <= e );
  if (ix === -1)
    ix = inputRange.length;
  return ix - 1;
}

function inverseFunc(inputRange, outputRange) {
  /*
  * If this starts taking up too much space in memory,
  * this should instead create the functions on the fly instead of caching them
  * */

  if (inputRange.length !== outputRange.length)
    throw new Error('Inverse estimation requires inputRange and outputRange to have the same length');

  if (inputRange.length < 2 || outputRange.length < 2)
    throw new Error('Inverse estimation requires at least 2 data points');

  let outputCache = outputRange.slice();

  // Generate the cache
  inputInterpolations = inputRange.map( (e, ix, arr) => {

    if (ix === arr.length - 1)
      return scaleLinear({start: outputRange[ix-1], end:e}, {start: arr[ix-1], end: e});
    else
      return scaleLinear({start: outputRange[ix], end: outputRange[ix+1]}, {start: e, end:arr[ix+1]});

  } );

  // add the extrapolation below the range
  inputInterpolations[-1] = inputInterpolations[0];

  // Whether the output is increasing or decreasing
  let increasing = outputRange[0] < outputRange[outputRange.length -1];

  if (!increasing) {
    inputInterpolations.reverse();
    outputCache.reverse();
  }

  let inverse = function (output) {
    let val;

    // Scan the cache
    let ix = _findRange(output, outputCache);

    val = inputInterpolations[ix](output);

    return val;
  };

  return inverse;
}
export {scaleLinear, scaleLogarithmic, scaleSqrt, inverseFunc};