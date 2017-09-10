const d3 = require('d3')
const { map, reduce, sortBy, find, reject, difference, merge, isNil } = require('lodash')

const valueScaleToAudioParameter = require('./value-scale-to-audio-parameter')
const {
  CONTROL_TYPE_GAIN,
  CONTROL_TYPE_LOW_BAND,
  CONTROL_TYPE_MID_BAND,
  CONTROL_TYPE_HIGH_BAND,
  CONTROL_TYPE_FILTER_HIGHPASS_CUTOFF,
  CONTROL_TYPE_FILTER_HIGHPASS_Q,
  CONTROL_TYPE_FILTER_LOWPASS_CUTOFF,
  CONTROL_TYPE_FILTER_LOWPASS_Q,
  CONTROL_TYPE_DELAY_WET,
  CONTROL_TYPE_DELAY_CUTOFF,
} = require('../../clips/constants')

const FX_CHAIN_ORDER = [
  CONTROL_TYPE_HIGH_BAND,
  CONTROL_TYPE_MID_BAND,
  CONTROL_TYPE_LOW_BAND,
  CONTROL_TYPE_GAIN
]

module.exports = function ({ clips, outputs, channel, startBeat, audioGraph, beatScale, currentBeat, currentTime }) {

  // sort automation clips by FX chain order
  const highpassClips = reject([
    find(clips, { controlType: CONTROL_TYPE_FILTER_HIGHPASS_CUTOFF }),
    find(clips, { controlType: CONTROL_TYPE_FILTER_HIGHPASS_Q })
  ], isNil)
  const lowpassClips = reject([
    find(clips, { controlType: CONTROL_TYPE_FILTER_LOWPASS_CUTOFF }),
    find(clips, { controlType: CONTROL_TYPE_FILTER_LOWPASS_Q })
  ], isNil)
  const delayClips = reject([
    find(clips, { controlType: CONTROL_TYPE_DELAY_CUTOFF }),
    find(clips, { controlType: CONTROL_TYPE_DELAY_WET })
  ], isNil)
  const sortedLevelsClips = sortBy(difference(clips, highpassClips, lowpassClips, delayClips),
    ({ controlType }) => FX_CHAIN_ORDER.indexOf(controlType))

  // console.log({
  //   highpassClips,
  //   lowpassClips,
  //   delayClips,
  //   sortedLevelsClips
  // })

  // 
  // desired node order: channel => effects => levels => output
  //
  let previousOutput = outputs

  // connect highpass, lowpass, and delay automations
  if (delayClips.length) {
    const audioProperties = reduce(
      delayClips,
      (audioProperties, clip) => merge({}, audioProperties, _getAutomationParameters({
        previousOutput, clip, startBeat, currentBeat, beatScale, currentTime })),
      {}
    )

    const audioGraphKey = `${channel.id}_delayNode`
    audioGraph[audioGraphKey] = ['delayNode', previousOutput, audioProperties]
    previousOutput = audioGraphKey
  }

  if (highpassClips.length) {
    const audioProperties = reduce(
      highpassClips,
      (audioProperties, clip) => merge({}, audioProperties, _getAutomationParameters({
        previousOutput, clip, startBeat, currentBeat, beatScale, currentTime })),
      { type: 'highpass' }
    )

    const audioGraphKey = `${channel.id}_highpassNode`
    audioGraph[audioGraphKey] = ['biquadFilter', previousOutput, audioProperties]
    previousOutput = audioGraphKey
  }

  if (lowpassClips.length) {
    const audioProperties = reduce(
      lowpassClips,
      (audioProperties, clip) => merge({}, audioProperties, _getAutomationParameters({
        previousOutput, clip, startBeat, currentBeat, beatScale, currentTime })),
      { type: 'lowpass' }
    )

    const audioGraphKey = `${channel.id}_lowpassNode`
    audioGraph[audioGraphKey] = ['biquadFilter', previousOutput, audioProperties]
    previousOutput = audioGraphKey
  }

  // connect levels automations in order, returning final output
  return reduce(sortedLevelsClips, (previousOutput, clip) => {
    const audioGraphKey = `${channel.id}_${clip.controlType}_${clip.id}`
    audioGraph[audioGraphKey] = _getAutomationParameters({
      previousOutput, clip, startBeat, currentBeat, beatScale, currentTime })

    return audioGraphKey
  }, previousOutput)
}

function _getAutomationParameters({
  previousOutput, clip, startBeat, currentBeat, beatScale, currentTime
}) {
  const controlPoints = clip.controlPoints || []
  const valueScale = d3.scaleLinear()
    // scale to automation clip start
    .domain(map(map(controlPoints, 'beat'), beat => beat - clip.startBeat))
    .range(map(controlPoints, 'scaledValue'))

  switch(clip.controlType) {
    case CONTROL_TYPE_GAIN:
      return ['gain', previousOutput, {
        gain: [
          ['setValueAtTime', 1, 0], // start all at 1
          valueScaleToAudioParameter({
            clip,
            startBeat,
            currentBeat,
            valueScale,
            beatScale,
            currentTime
          })
        ]
      }]
    case CONTROL_TYPE_LOW_BAND:
      return ['biquadFilter', previousOutput, {
        frequency: 70,
        type: 'lowshelf',
        gain: [
          ['setValueAtTime', 0, 0],
          valueScaleToAudioParameter({
            clip,
            startBeat,
            currentBeat,
            valueScale,
            beatScale,
            currentTime
          })
        ]
      }]
    case CONTROL_TYPE_MID_BAND:
      return ['biquadFilter', previousOutput, {
        frequency: 1000,
        type: 'peaking',
        gain: [
          ['setValueAtTime', 0, 0],
          valueScaleToAudioParameter({
            clip,
            startBeat,
            currentBeat,
            valueScale,
            beatScale,
            currentTime
          })
        ]
      }]
    case CONTROL_TYPE_HIGH_BAND:
      return ['biquadFilter', previousOutput, {
        frequency: 13000,
        type: 'highshelf',
        gain: [
          ['setValueAtTime', 0, 0],
          valueScaleToAudioParameter({
            clip,
            startBeat,
            currentBeat,
            valueScale,
            beatScale,
            currentTime
          })
        ]
      }]
    case CONTROL_TYPE_FILTER_HIGHPASS_CUTOFF:
      return {
        frequency: [
          ['setValueAtTime', 0, 0],
          valueScaleToAudioParameter({
            clip,
            startBeat,
            currentBeat,
            valueScale,
            beatScale,
            currentTime
          })
        ]
      }
    case CONTROL_TYPE_FILTER_HIGHPASS_Q:
      return {
        Q: [
          ['setValueAtTime', 1, 0],
          valueScaleToAudioParameter({
            clip,
            startBeat,
            currentBeat,
            valueScale,
            beatScale,
            currentTime
          })
        ]
      }
    case CONTROL_TYPE_FILTER_LOWPASS_CUTOFF:
      return {
        frequency: [
          ['setValueAtTime', 22050, 0],
          valueScaleToAudioParameter({
            clip,
            startBeat,
            currentBeat,
            valueScale,
            beatScale,
            currentTime
          })
        ]
      }
    case CONTROL_TYPE_FILTER_LOWPASS_Q:
      return {
        Q: [
          ['setValueAtTime', 1, 0],
          valueScaleToAudioParameter({
            clip,
            startBeat,
            currentBeat,
            valueScale,
            beatScale,
            currentTime
          })
        ]
      }
    case CONTROL_TYPE_DELAY_WET:
      return {
        'wet.gain': [
          ['setValueAtTime', 0, 0],
          valueScaleToAudioParameter({
            clip,
            startBeat,
            currentBeat,
            valueScale,
            beatScale,
            currentTime
          })
        ]
      }
    case CONTROL_TYPE_DELAY_CUTOFF:
      return {
        'filter.frequency': [
          ['setValueAtTime', 0, 0],
          valueScaleToAudioParameter({
            clip,
            startBeat,
            currentBeat,
            valueScale,
            beatScale,
            currentTime
          })
        ]
      }
    default:
      console.error('Unknown controlType while adding automations to audio graph', clip.controlType)
  }
}
