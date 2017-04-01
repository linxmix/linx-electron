const { map, merge, forEach, filter, find } = require('lodash')
const d3 = require('d3')

const createSoundtouchSource = (process.env.NODE_ENV === 'test')
  ? () => {} : require('./create-soundtouch-source')

const { PLAY_STATE_PLAYING } = require('../constants')
const getValueCurve = require('./get-value-curve')
const {
  validNumberOrDefault,
  isValidNumber,
  beatToTime
} = require('../../lib/number-utils')
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

  if (gainAutomationClip) {
    const gainControlPoints = gainAutomationClip.controlPoints || []
    const gainScale = d3.scaleLinear()
      .domain(map(map(gainControlPoints, 'beat'), beat => beat - gainAutomationClip.startBeat))
      .range(map(gainControlPoints, 'value'))
    const gainCurve = getValueCurve({
      scale: gainScale,
      beatCount: gainAutomationClip.beatCount
    })
    const clipStartBeat = startBeat + gainAutomationClip.startBeat
    const clipEndBeat = clipStartBeat + gainAutomationClip.beatCount

    let startTime = beatScale(clipStartBeat - playState.seekBeat)
    const endTime = beatScale(clipEndBeat - playState.seekBeat)
    let duration = endTime - startTime

    console.log("GAIN AUTOMATION CLIP", {
      startTime,
      endTime,
      duration,
      clipStartBeat,
      clipEndBeat,
      gainCurve,
      gainControlPoints
    })

    // if seek in middle of clip, start now and adjust duration
    if (playState.seekBeat > clipStartBeat) {
      startTime = 0
      duration += beatScale.invert(playState.seekBeat - clipStartBeat)
    }

    gainControlArray[1] = ['setValueCurveAtTime', gainCurve,
      playState.absSeekTime + startTime, duration]
  }

  const audioGraph = {
    // NOTE: virtual-audio-graph interprets numberOfOutputs here as the # of merger inputs
    [channel.id]: ['channelMerger', gainNodeKey, { numberOfOutputs: nestedChannels.length }],
    [gainNodeKey]: ['gain', outputs, { gain: gainControlArray }]
  }

  // generate sample clip nodes
  forEach(filter(channel.clips, { type: CLIP_TYPE_SAMPLE }), clip => _addSampleClipNodeToGraph({
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

function _getSampleClipTempoScale ({ bpmScale, audioBpm, startBeat, endBeat }) {
  const tempoScaleDomain = [startBeat]
    .concat(filter(bpmScale.domain(), beat => (beat > startBeat && beat < endBeat)))
    .concat([endBeat])

  const tempoScaleRange = map(tempoScaleDomain, beat => {
    const syncBpm = bpmScale(beat)
    return (isValidNumber(syncBpm) && isValidNumber(audioBpm)) ? (syncBpm / audioBpm) : 1
  })

  return d3.scaleLinear()
    .domain(tempoScaleDomain)
    .range(tempoScaleRange)
}

function _addSampleClipNodeToGraph({ outputs, startBeat, audioGraph, clip, playState,
  bpmScale, beatScale }) {
  const clipStartBeat = startBeat + clip.startBeat
  const clipEndBeat = clipStartBeat + clip.beatCount
  const audioBpm = clip.sample.meta.bpm

  // if not playing or seek is beyond clip, stop here
  if ((playState.status !== PLAY_STATE_PLAYING) ||
    (playState.seekBeat > clipEndBeat)) {
    return
  }

  const tempoScale = _getSampleClipTempoScale({
    bpmScale,
    audioBpm,
    startBeat: clipStartBeat,
    endBeat: clipEndBeat
  })
  const tempoCurve = getValueCurve({
    scale: tempoScale,
    beatCount: clip.beatCount
  })

  let startTime = beatScale(clipStartBeat - playState.seekBeat)
  let offsetTime = clip.audioStartTime
  const stopTime = beatScale(clipEndBeat - playState.seekBeat)

  // if seek in middle of clip, start now and adjust offsetTime
  if (playState.seekBeat > clipStartBeat) {
    startTime = 0
    offsetTime += beatToTime(playState.seekBeat - clipStartBeat, audioBpm)
  }

  console.log({
    name: clip.sample.meta.title,
    clipStartBeat,
    clipEndBeat,
    'playState.seekBeat': playState.seekBeat,
    startTime,
    stopTime,
    offsetTime,
    audioBpm: clip.sample.meta.bpm
  })

  audioGraph[clip.id] = ['soundtouchSource', outputs, {
    buffer: clip.sample.audioBuffer,
    offsetTime,
    startTime: playState.absSeekTime + startTime,
    stopTime: playState.absSeekTime + stopTime,
    tempo: ['setValueCurveAtTime', tempoCurve, playState.absSeekTime + startTime, stopTime - startTime]
  }]
}
