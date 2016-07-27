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
 * @param depth {number = 1} How many times to apply the scaling
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
 * @param inputRange {{start: number, end: number }}
 * @param outputRange {{start:number, end:number }}
 * @param depth {number = 1} How many times to apply the scaling
 * @returns { function } Scaled mapping function
 * @private
 */
function scaleSqrt(inputRange, outputRange, depth = 1 ) {
  // Maps a linear scale to a sqrt scale
  let sqrt = Math.sqrt;
  let sqr = num => Math.pow(num, 2);
  let f = function (input, debug = false) {
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

function scaleWindow (inputRange, outputRange, valuedInputs, valueLabel = 'x') {
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

  return { [valueLabel]: {inputRange: inputRange, outputRange: outputRange} }
}

export {scaleLinear, scaleLogarithmic, scaleSqrt, scaleWindow}