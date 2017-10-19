const d3 = require('d3')

const { isValidNumber, validNumberOrDefault } = require('../../lib/number-utils')

const TICKS_PER_SECOND = 500

function _getValueCurve ({ startTime, duration, valueScale }) {
  if (!(valueScale && (duration > 0))) { return new Float32Array(0) }

  // console.log('_getValueCurve', {
  //   startValue: valueScale(startTime),
  //   endValue: valueScale(startTime + duration),
  //   startTime,
  //   duration
  // })

  // populate Float32Array by sampling Curve
  const numTicks = Math.floor(duration * TICKS_PER_SECOND)
  const values = new Float32Array(numTicks)
  for (let i = 0; i < numTicks; i++) {
    let value

    // for first and last, use start and end respectively
    if (i === 0) { value = valueScale(startTime) }

    // use numTicks - 10 to make sure it gets there. TODO: this shouldnt have to happen!
    else if (i >= numTicks - 10) {
      value = valueScale(startTime + duration) }

    // otherwise, get value
    else {
      const time = startTime + ((i / numTicks) * duration)
      value = valueScale(time)
    }

    values[i] = value
  }

  return values
}

// valueScale is defined in clip's frame of reference
// startBeat, beatScale, currentBeat, beatTime are all defined in mix's frame of reference
module.exports = function valueScaleToAudioParameter ({
  currentBeat,
  currentTime,
  clip,
  startBeat,
  beatScale,
  valueScale
}) {
  const clipStartBeat = startBeat + clip.startBeat
  const clipEndBeat = clipStartBeat + clip.beatCount
  const fullDuration = beatScale(clipEndBeat) - beatScale(startBeat)
  const endValue = validNumberOrDefault(valueScale(fullDuration), valueScale.range()[0])

  // if seeking beyond clip, just report final value
  if (currentBeat >= clipEndBeat) {
    return ['setValueAtTime',
      endValue,
      Math.max(0, currentTime + beatScale(clipEndBeat) - beatScale(currentBeat))]
  }

  // if only one automation, just report final value
  if (valueScale.range().length === 1) {
    return ['setValueAtTime', endValue, 0]
  }

  // if seek before clip, proceed as normal
  let valueCurve, startTime, duration
  if (currentBeat < clipStartBeat) {
    startTime = beatScale(clipStartBeat) - beatScale(currentBeat)
    duration = beatScale(clipEndBeat) - beatScale(clipStartBeat)
    
    valueCurve = _getValueCurve({
      startTime: 0,
      duration,
      valueScale
    })

  // if seek in middle of clip, start now and adjust duration
  } else {
    startTime = 0
    duration = beatScale(clipEndBeat) - beatScale(currentBeat)

    valueCurve = _getValueCurve({
      startTime: beatScale(currentBeat) - beatScale(clipStartBeat),
      duration,
      valueScale
    })
  }

  // console.log('valueScaleToAudioParameter', {
  //   absStartTime: currentTime + startTime,
  //   controlType: clip.controlType,
  //   clip,
  //   currentTime,
  //   currentBeat,
  //   startTime,
  //   duration,
  //   clipStartBeat,
  //   clipEndBeat,
  //   valueCurve,
  //   startBeat,
  //   'valueScale.domain': valueScale.domain(),
  //   'valueScale.range': valueScale.range(),
  // })

  return ['setValueCurveAtTime', valueCurve,
    currentTime + startTime, duration]
}