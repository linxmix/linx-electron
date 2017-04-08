const { map, merge, forEach, filter, find } = require('lodash')
const d3 = require('d3')

const createSoundtouchSource = (process.env.NODE_ENV === 'test')
  ? () => {} : require('./create-soundtouch-source')

const getValueCurve = require('./get-value-curve')
const addSampleClipToAudioGraph = require('./add-sample-clip-to-audio-graph')
const { validNumberOrDefault } = require('../../lib/number-utils')
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
  const gainClipStartBeat = startBeat + (gainAutomationClip || {}).startBeat
  const gainClipEndBeat = gainClipStartBeat + (gainAutomationClip || {}).beatCount
  if (gainAutomationClip && (gainClipEndBeat > playState.seekBeat)) {
    const gainControlPoints = gainAutomationClip.controlPoints || []
    const gainScale = d3.scaleLinear()
      // scale to gain automation clip start
      .domain(map(map(gainControlPoints, 'beat'), beat => beat - gainAutomationClip.startBeat))
      .range(map(gainControlPoints, 'value'))
    const clipStartBeat = gainClipStartBeat
    const clipEndBeat = gainClipEndBeat


    // if seek before clip, proceed as normal
    let gainCurve, startTime, endTime, duration
    if (playState.seekBeat < clipStartBeat) {
      startTime = beatScale(clipStartBeat) - beatScale(playState.seekBeat)
      endTime = beatScale(clipEndBeat) - beatScale(playState.seekBeat)
      duration = endTime - startTime
      gainCurve = getValueCurve({
        scale: gainScale,
        beatCount: clipEndBeat - clipStartBeat
      })

    // if seek in middle of clip, start now and adjust duration
    } else {
      startTime = 0
      endTime = beatScale(clipEndBeat) - beatScale(playState.seekBeat)
      duration = endTime - startTime

      gainCurve = getValueCurve({
        scale: gainScale,
        startBeat: playState.seekBeat - clipStartBeat,
        beatCount: clipEndBeat - playState.seekBeat
      })
    }


    console.log('GAIN AUTOMATION CLIP', {
      absStartTime: playState.absSeekTime + startTime,
      startTime,
      endTime,
      duration,
      clipStartBeat,
      clipEndBeat,
      gainCurve,
      gainControlPoints,
      startBeat: playState.seekBeat - gainClipStartBeat,
      beatCount: gainClipEndBeat - playState.seekBeat
    })

    gainControlArray[1] = ['setValueCurveAtTime', gainCurve,
      playState.absSeekTime + startTime, duration]
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
    beatScale
  }))

  return merge(audioGraph, ...nestedAudioGraphs)
}

