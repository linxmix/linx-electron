const d3 = require('d3')
const { map, reduce, sortBy, last } = require('lodash')

const getValueCurve = require('./get-value-curve')
const {
  CONTROL_TYPE_GAIN
} = require('../../clips/constants')

const FX_CHAIN_ORDER = [CONTROL_TYPE_GAIN]

module.exports = function ({ clips, outputs, channel, startBeat, audioGraph, beatScale, currentBeat, currentTime }) {

  // sort automation clips by FX chain order
  const sortedClips = sortBy(clips, ({ controlType }) => FX_CHAIN_ORDER.indexOf(controlType))

  // connect automations in order, returning final output
  return reduce(sortedClips, (previousOutput, clip) => {

    let automationParameters;
    switch(clip.controlType) {
      case CONTROL_TYPE_GAIN:
        automationParameters = {
          gain: [
            ['setValueAtTime', 1, 0], // start all at 1
            _generateAutomationParameters({
              clip,
              startBeat,
              currentBeat,
              beatScale,
              currentTime
            })
          ]
        }
        break;
      default:
        console.error('Unknown controlType while adding automations to audio graph', clip.controlType)
    }

    const audioGraphKey = `${channel.id}_${clip.controlType}_${clip.id}`
    audioGraph[audioGraphKey] = [clip.controlType, previousOutput, automationParameters]

    return audioGraphKey
  }, outputs)
}

function _generateAutomationParameters ({
  currentBeat,
  currentTime,
  clip,
  startBeat,
  beatScale
}) {
  const controlPoints = clip.controlPoints || []
  const valueScale = d3.scaleLinear()
      // scale to automation clip start
      .domain(map(map(controlPoints, 'beat'), beat => beat - clip.startBeat))
      .range(map(controlPoints, 'value'))
  const clipStartBeat = startBeat + clip.startBeat
  const clipEndBeat = clipStartBeat + clip.beatCount

    // if seeking beyond clip, just report final value
  if (currentBeat >= clipEndBeat) {
    return ['setValueAtTime',
      last(controlPoints).value,
      Math.max(0, currentTime + beatScale(clipEndBeat) - beatScale(currentBeat))]
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

  console.log('GENERATE_AUTOMATION_PARAMETERS', {
    absStartTime: currentTime + startTime,
    currentTime,
    currentBeat,
    startTime,
    endTime,
    duration,
    clipStartBeat,
    clipEndBeat,
    valueCurve,
    controlPoints,
    startBeat: currentBeat - clipStartBeat,
    beatCount: clipEndBeat - currentBeat
  })

  return ['setValueCurveAtTime', valueCurve,
    currentTime + startTime, duration]
}