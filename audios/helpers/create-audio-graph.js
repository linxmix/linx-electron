const { map, merge, forEach, filter } = require('lodash')
const d3 = require('d3')
const Tuna = require('tunajs')

const createSoundtouchSource = (process.env.NODE_ENV === 'test')
  ? () => {} : require('./create-soundtouch-source')

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

  // hack to add custom node creation to audioContext
  audioContext.createSoundtouchSource = () => createSoundtouchSource(audioContext)
  audioContext.createDelayNode = () => (new (new Tuna(audioContext)).Delay())

  // generate audio graphs for nested channels
  const { channels: nestedChannels = [] } = channel
  const nestedAudioGraphs = map(nestedChannels, (nestedChannel) =>
    createAudioGraph({
      channel: nestedChannel,
      audioContext,
      playState,
      beatScale,
      bpmScale,
      startBeat: startBeat + validNumberOrDefault(nestedChannel.startBeat, 0),
      outputs: channel.id
    })
  )

  // generate automation clip nodes
  const audioGraph = {}
  const currentBeat = getCurrentBeat({ playState, audioContext, beatScale })
  const currentTime = audioContext.currentTime
  const channelOutput = addAutomationClipsToAudioGraph({
    clips: filter(channel.clips, clip =>
      ((clip.type === CLIP_TYPE_AUTOMATION) && clip.controlPoints.length)),
    outputs,
    channel,
    startBeat,
    audioGraph,
    currentBeat,
    currentTime,
    beatScale,
    bpmScale
  })

  // add channel node
  audioGraph[channel.id] = ['gain', channelOutput, { gain: channel.gain }]

  // generate sample clip nodes, unless another channel is being solo'd
  if (!playState.soloChannelId || playState.soloChannelId === channel.id) {
    forEach(filter(channel.clips, { type: CLIP_TYPE_SAMPLE }), clip => addSampleClipToAudioGraph({
      outputs: channel.id,
      pitchSemitones: channel.pitchSemitones,
      startBeat,
      audioGraph,
      clip,
      playState,
      bpmScale,
      currentBeat,
      currentTime,
      beatScale,
    }))
  }

  return merge(audioGraph, ...nestedAudioGraphs)
}
