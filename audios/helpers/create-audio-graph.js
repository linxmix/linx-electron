const { map, merge, forEach, filter, find, last } = require('lodash')
const d3 = require('d3')

const createSoundtouchSource = (process.env.NODE_ENV === 'test')
  ? () => {} : require('./create-soundtouch-source')

const getValueCurve = require('./get-value-curve')
const addSampleClipToAudioGraph = require('./add-sample-clip-to-audio-graph')
const addAutomationClipsToAudioGraph = require('./add-automation-clips-to-audio-graph')
const { validNumberOrDefault } = require('../../lib/number-utils')
const getCurrentBeat = require('./get-current-beat')
const {
  CLIP_TYPE_SAMPLE,
  CLIP_TYPE_AUTOMATION
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
  const audioGraph = {}

  // hack to add createSoundtouchSource to audioContext
  audioContext.createSoundtouchSource = () => createSoundtouchSource(audioContext)

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

  // generate automation clip nodes
  const channelOutput = addAutomationClipsToAudioGraph({
    clips: filter(channel.clips, { type: CLIP_TYPE_AUTOMATION }),
    outputs,
    channel,
    startBeat,
    audioGraph,
    currentBeat,
    currentTime,
    beatScale
  })

  // add channel merger node
  // NOTE: virtual-audio-graph interprets numberOfOutputs here as the # of merger inputs
  audioGraph[channel.id] = ['channelMerger', channelOutput, { numberOfOutputs: nestedChannels.length }]

  // generate audio graphs for nested channels
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

  return merge(audioGraph, ...nestedAudioGraphs)
}
