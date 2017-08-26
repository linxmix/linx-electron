const { isValidNumber } = require('../../lib/number-utils')

const TICKS_PER_BEAT = 100

module.exports = function ({ scale, startBeat = 0, beatCount }) {
  if (!(scale && (beatCount > 0))) { return new Float32Array(0) }

  const startValue = scale(startBeat)
  const endValue = scale(startBeat + beatCount)

  // populate Float32Array by sampling Curve
  const numTicks = Math.floor(beatCount * TICKS_PER_BEAT)
  const values = new Float32Array(numTicks)
  for (let i = 0; i < numTicks; i++) {
    let value

    // first first and last, use start or end of scale    
    if (i === 0) { value = scale(startBeat) }

    // TODO use numTicks - 10 to make sure it gets there. this shouldnt have to happen!
    else if (i >= numTicks - 10) { value = scale(startBeat + beatCount) }

    // otherwise, get value indicated by scale
    else {
      const beat = (i / numTicks) * beatCount
      value = scale(startBeat + beat)
    }

    values[i] = value
  }

  return values
}
