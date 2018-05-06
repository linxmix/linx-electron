const d3 = require('d3')
const { map, reduce, filter, sortBy, find, reject, difference, merge, isNil } = require('lodash')

const { bpmToSpb, validNumberOrDefault } = require('../../lib/number-utils')
const { getValueCurve, valueScaleToAudioParameter } = require('./value-scale-to-audio-parameter')
const {
  CONTROL_TYPE_VOLUME,
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
  CONTROL_TYPE_DELAY_TIME,
  CONTROL_TYPE_REVERB
} = require('../../clips/constants')

const FX_CHAIN_ORDER = [
  CONTROL_TYPE_HIGH_BAND,
  CONTROL_TYPE_MID_BAND,
  CONTROL_TYPE_LOW_BAND,
  CONTROL_TYPE_VOLUME,
  CONTROL_TYPE_GAIN
]

module.exports = function ({ clips, outputs, channel, startBeat, audioGraph, beatScale, bpmScale, currentBeat, currentTime }) {

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
  const reverbClip = find(clips, { controlType: CONTROL_TYPE_REVERB })
  const sortedLevelsClips = sortBy(difference(clips, highpassClips, lowpassClips, delayClips, [reverbClip]),
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

  // connect highpass, lowpass, reverb, and delay automations
  if (highpassClips.length) {
    const audioProperties = reduce(
      highpassClips,
      (audioProperties, clip) => merge({}, audioProperties, _getVirtualNode({
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
      (audioProperties, clip) => merge({}, audioProperties, _getVirtualNode({
        previousOutput, clip, startBeat, currentBeat, beatScale, currentTime })),
      { type: 'lowpass' }
    )

    const audioGraphKey = `${channel.id}_lowpassNode`
    audioGraph[audioGraphKey] = ['biquadFilter', previousOutput, audioProperties]
    previousOutput = audioGraphKey
  }

  if (reverbClip) {
    const reverbSample = channel.reverbSample
    const reverbInKey = `${channel.id}_reverbNode_in`
    const reverbOutKey = `${channel.id}_reverbNode_out`
    const reverbWetKey = `${channel.id}_reverbNode_wet`
    const reverbDryKey = `${channel.id}_reverbNode_dry`
    const reverbKey = `${channel.id}_reverbNode`

    // TODO: abstract this better with _getAudioParameters
    // scale to automation clip start in time domain
    const controlPoints = reverbClip.controlPoints || []
    const clipStartTime = beatScale(startBeat + reverbClip.startBeat)
    const valueScaleDomain = map(controlPoints,
        ({ beat }) => beatScale(beat + startBeat) - clipStartTime)
    const wetValueScale = d3.scaleLinear()
      .domain(valueScaleDomain)
      .range(map(controlPoints, 'scaledValue'))
      .clamp(true)
    const dryValueScale = d3.scaleLinear()
      .domain(valueScaleDomain)
      .range(map(wetValueScale.range(), value => 1 - value))
      .clamp(true)

    const wetStartValue = validNumberOrDefault(wetValueScale(0), wetValueScale.range()[0])
    const wetAudioParameters = [
      ['setValueAtTime', wetStartValue, 0],
      valueScaleToAudioParameter({
        valueScale: wetValueScale,
        clip: reverbClip,
        startBeat,
        currentBeat,
        beatScale,
        currentTime
      })
    ]

    const dryStartValue = validNumberOrDefault(dryValueScale(0), dryValueScale.range()[0])
    const dryAudioParameters = [
      ['setValueAtTime', dryStartValue, 1],
      valueScaleToAudioParameter({
        valueScale: dryValueScale,
        clip: reverbClip,
        startBeat,
        currentBeat,
        beatScale,
        currentTime
      })
    ]

    audioGraph[reverbOutKey] = ['gain', previousOutput]
    audioGraph[reverbWetKey] = ['gain', reverbOutKey, { gain: wetAudioParameters }]
    audioGraph[reverbKey] = ['convolver', reverbWetKey, { buffer: reverbSample.audioBuffer }]
    audioGraph[reverbInKey] = ['gain', [reverbKey, reverbDryKey]]
    audioGraph[reverbDryKey] = ['gain', reverbOutKey, { gain: dryAudioParameters }]
    previousOutput = reverbInKey
  }

  if (delayClips.length) {
    const audioProperties = reduce(
      delayClips,
      (audioProperties, clip) => merge({}, audioProperties, _getVirtualNode({
        previousOutput, clip, startBeat, currentBeat, beatScale, currentTime })),
      {}
    )

    // default feedback to 0.7
    audioProperties['feedbackNode.gain'] = ['setValueAtTime', 0.7, 0]

    // add delayTime in quarter notes
    const delayTimeValueScale = _getDelayTimeValueScale({
      delayTime: channel.delayTime,
      beatScale,
      bpmScale,

      // account for full length of channel, in case there are clips before channel.startBeat
      startBeat: (startBeat - channel.startBeat) + channel.minBeat,
      endBeat: startBeat + channel.maxBeat
    })
    audioProperties['delay.delayTime'] = valueScaleToAudioParameter({
      clip: {
        startBeat: channel.minBeat,
        beatCount: channel.beatCount,
        controlType: 'delayTime for logging'
      },
      startBeat,
      currentBeat,
      valueScale: delayTimeValueScale,
      beatScale,
      currentTime
    })

    // console.log('delayTime', {
    //   delayClips,
    //   audioProperties,
    //   startBeat,
    //   currentBeat,
    //   'channel.beatCount': channel.beatCount,
    //   'channel.startBeat': channel.startBeat,
    //   channel,
    //   currentTime,
    //   'name': channel.sample.meta.title,
    //   'delayTimeValueScale.domain': delayTimeValueScale.domain(),
    //   'delayTimeValueScale.range': delayTimeValueScale.range(),
    // })

    const audioGraphKey = `${channel.id}_delayNode`
    audioGraph[audioGraphKey] = ['delayNode', previousOutput, audioProperties]
    previousOutput = audioGraphKey
  }


  // connect levels automations in order, returning previousOutput to connect to the source node
  return reduce(sortedLevelsClips, (previousOutput, clip) => {
    const audioGraphKey = `${channel.id}_${clip.controlType}_${clip.id}`
    audioGraph[audioGraphKey] = _getVirtualNode({
      previousOutput, clip, startBeat, currentBeat, beatScale, currentTime })

    return audioGraphKey
  }, previousOutput)
}

function _getAudioParameters({
  previousOutput, clip, startBeat, currentBeat, beatScale, currentTime
}) {
  const controlPoints = clip.controlPoints || []

  // scale to automation clip start in time domain
  const clipStartTime = beatScale(startBeat + clip.startBeat)
  const valueScaleDomain = map(controlPoints,
      ({ beat }) => beatScale(beat + startBeat) - clipStartTime)
  const valueScale = d3.scaleLinear()
    .domain(valueScaleDomain)
    .range(map(controlPoints, 'scaledValue'))
    .clamp(true)
  const startValue = validNumberOrDefault(valueScale(0), valueScale.range()[0])

  return [
    ['setValueAtTime', startValue, 0],
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

function _getVirtualNode(options) {
  const audioParameters = _getAudioParameters(options)
  const controlType = options.clip.controlType
  const previousOutput = options.previousOutput
  switch(controlType) {
    case CONTROL_TYPE_GAIN: case CONTROL_TYPE_VOLUME:
      return ['gain', previousOutput, {
        gain: audioParameters
      }]
    case CONTROL_TYPE_LOW_BAND:
      return ['biquadFilter', previousOutput, {
        frequency: 70,
        type: 'lowshelf',
        gain: audioParameters
      }]
    case CONTROL_TYPE_MID_BAND:
      return ['biquadFilter', previousOutput, {
        frequency: 1000,
        type: 'peaking',
        gain: audioParameters
      }]
    case CONTROL_TYPE_HIGH_BAND:
      return ['biquadFilter', previousOutput, {
        frequency: 13000,
        type: 'highshelf',
        gain: audioParameters
      }]
    case CONTROL_TYPE_FILTER_HIGHPASS_CUTOFF:
      return {
        frequency: audioParameters
      }
    case CONTROL_TYPE_FILTER_HIGHPASS_Q:
      return {
        Q: audioParameters
      }
    case CONTROL_TYPE_FILTER_LOWPASS_CUTOFF:
      return {
        frequency: audioParameters
      }
    case CONTROL_TYPE_FILTER_LOWPASS_Q:
      return {
        Q: audioParameters
      }
    case CONTROL_TYPE_DELAY_WET:
      return {
        'wet.gain': audioParameters
      }
    case CONTROL_TYPE_DELAY_CUTOFF:
      return {
        'filter.frequency': audioParameters
      }
    default:
      console.error('Unknown controlType while adding automations to audio graph', controlType)
  }
}

// convert from beat=>bpm scale, in mix frame of reference, to time=>delayTime scale, in clip frame of reference
function _getDelayTimeValueScale ({ beatScale, bpmScale, startBeat, endBeat, delayTime = 0.25 }) {
  const beatScaleDomainWithinRange = filter(beatScale.domain(),
    beat => (beat > startBeat && beat < endBeat))
  const startTime = beatScale(startBeat)

  const delayTimeDomain = [0]
    .concat(map(beatScaleDomainWithinRange, beat => beatScale(beat) - startTime))
    .concat(beatScale(endBeat) - startTime)

  const delayTimeRange = map(delayTimeDomain, time => {
    return bpmToSpb(bpmScale(beatScale.invert(time + startTime))) * (4 * delayTime)
  })

  return d3.scaleLinear()
    .domain(delayTimeDomain)
    .range(delayTimeRange)
    .clamp(true)
}
