// TODO: compute value curve from given params 

module.exports = function ({ scale, beatCount, startValue, endValue }) {
  //   if (!(scale && (beatCount > 0))) { return new Float32Array(0); }

  //   // populate Float32Array by sampling Curve
  //   const numTicks = beatCount * TICKS_PER_BEAT;
  //   const values = new Float32Array(numTicks);
  //   for (let i = 0; i < numTicks; i++) {

  //     // for first value, use startValue
  //     let value;
  //     if (i === 0) {
  //       value = startValue;

  //     // for last value, get last point's value
  //     } else if (i === numTicks - 1) {
  //       value = endValue;

  //     // otherwise, get value indicated by scale
  //     } else {
  //       const beat = (i / numTicks) * beatCount;
  //       value = scale(beat);
  //     }

  //     values[i] = value;
  //   }

  //   return values;
  // }),
}
