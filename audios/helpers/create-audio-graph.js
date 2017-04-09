const { map, merge, forEach, filter, find, last } = require('lodash')
const d3 = require('d3')

const createSoundtouchSource = (process.env.NODE_ENV === 'test')
  ? () => {} : require('./create-soundtouch-source')

const getValueCurve = require('./get-value-curve')
const addSampleClipToAudioGraph = require('./add-sample-clip-to-audio-graph')
const { validNumberOrDefault } = require('../../lib/number-utils')
const getCurrentBeat = require('./get-current-beat')
const {
  CLIP_TYPE_SAMPLE,
  CLIP_TYPE_AUTOMATION,
  CONTROL_TYPE_GAIN
} = require('../../clips/constants')

module.exports = createAudioGraph

function createAudioGraph ({
  channel,
  audioContext,
  outputs = 'output',
  playState,
  startBeat,
  beatScale,
  bpmScale
}) {
  startBeat = validNumberOrDefault(startBeat, 0)
  const currentBeat = getCurrentBeat({ playState, audioContext, beatScale })
  const currentTime = audioContext.currentTime
  const { channels: nestedChannels = [] } = channel

  // hack to add createSoundtouchSource to audioContext
  audioContext.createSoundtouchSource = () => createSoundtouchSource(audioContext)

  // generate nested channel audio graphs
  const nestedAudioGraphs = map(nestedChannels, (nestedChannel, i) =>
    createAudioGraph({
      channel: nestedChannel,
      audioContext,
      playState,
      beatScale,
      bpmScale,
      startBeat: startBeat + validNumberOrDefault(nestedChannel.startBeat, 0),
      outputs: { key: channel.id, outputs: [i], inputs: [0] }
    })
  )

  // generate channel and FX chain nodes
  const gainNodeKey = `${channel.id}_gain`
  const gainAutomationClip = find(channel.clips, {
    type: CLIP_TYPE_AUTOMATION,
    controlType: CONTROL_TYPE_GAIN
  })
  const gainControlArray = [['setValueAtTime', 1, 0]] // start all volumes at 1

  // TODO: get rid of ugly hacks. abstract for various automation types
  if (gainAutomationClip) {
    gainControlArray[1] = _addGainAutomationToAudioGraph({
      clip: gainAutomationClip,
      startBeat,
      currentBeat,
      beatScale,
      currentTime
    })
  }

  const audioGraph = {
    // NOTE: virtual-audio-graph interprets numberOfOutputs here as the # of merger inputs
    [channel.id]: ['channelMerger', gainNodeKey, { numberOfOutputs: nestedChannels.length }],
    [gainNodeKey]: ['gain', outputs, { gain: gainControlArray }]
  }

  // generate sample clip nodes
  forEach(filter(channel.clips, { type: CLIP_TYPE_SAMPLE }), clip => addSampleClipToAudioGraph({
    outputs: channel.id,
    startBeat,
    audioGraph,
    clip,
    playState,
    bpmScale,
    currentBeat,
    currentTime,
    beatScale
  }))

  return merge(audioGraph, ...nestedAudioGraphs)
}

function _addGainAutomationToAudioGraph({
  currentBeat,
  currentTime,
  clip,
  startBeat,
  beatScale
}) {
    const gainControlPoints = clip.controlPoints || []
    const gainScale = d3.scaleLinear()
      // scale to gain automation clip start
      .domain(map(map(gainControlPoints, 'beat'), beat => beat - clip.startBeat))
      .range(map(gainControlPoints, 'value'))
    const clipStartBeat = startBeat + clip.startBeat
    const clipEndBeat = clipStartBeat + clip.beatCount

    // if seeking beyond clip, just report final value
    if (currentBeat >= clipEndBeat) {
      console.log('final value', last(gainControlPoints).value, beatScale(clipEndBeat), currentTime)
      return ['setValueAtTime',
        last(gainControlPoints).value,
        Math.max(0, currentTime + beatScale(clipEndBeat) - beatScale(currentBeat))]
    }

    // if seek before clip, proceed as normal
    let gainCurve, startTime, endTime, duration
    if (currentBeat < clipStartBeat) {
      startTime = beatScale(clipStartBeat) - beatScale(currentBeat)
      endTime = beatScale(clipEndBeat) - beatScale(currentBeat)
      duration = endTime - startTime
      gainCurve = getValueCurve({
        scale: gainScale,
        beatCount: clipEndBeat - clipStartBeat
      })

    // if seek in middle of clip, start now and adjust duration
    } else {
      startTime = 0
      endTime = beatScale(clipEndBeat) - beatScale(currentBeat)
      duration = endTime - startTime

      gainCurve = getValueCurve({
        scale: gainScale,
        startBeat: currentBeat - clipStartBeat,
        beatCount: clipEndBeat - currentBeat
      })
    }

    console.log('GAIN AUTOMATION CLIP', {
      absStartTime: currentTime + startTime,
      currentTime,
      currentBeat,
      startTime,
      endTime,
      duration,
      clipStartBeat,
      clipEndBeat,
      gainCurve,
      gainControlPoints,
      startBeat: currentBeat - clipStartBeat,
      beatCount: clipEndBeat - currentBeat
    })

  return ['setValueCurveAtTime', gainCurve,
      currentTime + startTime, duration]
}
