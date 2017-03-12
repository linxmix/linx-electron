const { isValidNumber } = require('../../lib/number-utils')

const TICKS_PER_BEAT = 100;

module.exports = function ({ scale, beatCount, startValue, endValue }) {
  if (!(scale && (beatCount > 0))) { return new Float32Array(0); }

  // populate Float32Array by sampling Curve
  const numTicks = beatCount * TICKS_PER_BEAT;
  const values = new Float32Array(numTicks);
  for (let i = 0; i < numTicks; i++) {

    // for first value, use startValue if specified
    let value;
    if (i === 0 && isValidNumber(startValue)) {
      value = startValue;

    // for last value, get last point's value if specified
    } else if (i === numTicks - 1 && isValidNumber(endValue)) {
      value = endValue;

    // otherwise, get value indicated by scale
    } else {
      const beat = (i / numTicks) * beatCount;
      value = scale(beat);
    }

    values[i] = value;
  }

  return values;
}
