const { isValidNumber } = require('../../lib/number-utils')

const TICKS_PER_BEAT = 100

function getValueCurve ({ scale, startBeat = 0, beatCount }) {
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
  const endValue = valueScale(clip.beatCount)

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
  let valueCurve, startTime, endTime, duration
  if (currentBeat < clipStartBeat) {
    startTime = beatScale(clipStartBeat) - beatScale(currentBeat)
    endTime = beatScale(clipEndBeat) - beatScale(currentBeat)
    duration = endTime - startTime
    
    valueCurve = getValueCurve({
      scale: valueScale,
      beatCount: clipEndBeat - clipStartBeat
    })

  // if seek in middle of clip, start now and adjust duration
  } else {
    startTime = 0
    endTime = beatScale(clipEndBeat) - beatScale(currentBeat)
    duration = endTime - startTime

    valueCurve = getValueCurve({
      scale: valueScale,
      startBeat: currentBeat - clipStartBeat,
      beatCount: clipEndBeat - currentBeat
    })
  }

  console.log('valueScaleToAudioParameter', {
    absStartTime: currentTime + startTime,
    controlType: clip.controlType,
    clip,
    currentTime,
    currentBeat,
    startTime,
    endTime,
    duration,
    clipStartBeat,
    clipEndBeat,
    valueCurve,
    startBeat: currentBeat - clipStartBeat,
    beatCount: clipEndBeat - currentBeat,
    'valueScale.domain': valueScale.domain(),
    'valueScale.range': valueScale.range(),
  })

  return ['setValueCurveAtTime', valueCurve,
    currentTime + startTime, duration]
}
