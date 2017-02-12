const { map, merge, forEach } = require('lodash')

module.exports = createAudioGraph

function createAudioGraph ({ channel, audioContext, outputs = 'output' }) {
  const { channels: nestedChannels = [] } = channel
  const { currentTime } = audioContext

  audioContext.createSoundtouchSource = createSoundtouchSource

  const nestedAudioGraphs = map(nestedChannels, (nestedChannel, i) =>
    createAudioGraph({
      channel: nestedChannel,
      audioContext,
      outputs: { key: channel.id, outputs: [i], inputs: [0] }
    })
  )

  // TODO(FUTURE):
  // create FX chain
  // add automations

  const audioGraph = {
    // NOTE: virtual-audio-graph interprets numberOfOutputs here as the # of merger inputs
    [channel.id]: ['channelMerger', outputs, { numberOfOutputs: nestedChannels.length }]
  }

  forEach(channel.clips, clip => {
    audioGraph[clip.id] = ['soundtouchSource', channel.id, {
      buffer: clip.sample.audioBuffer,
      startTime: currentTime,
      offsetTime: 5,
    }]
  })

  return merge(audioGraph, ...nestedAudioGraphs)
}

function createSoundtouchSource(...args) {
  const thing = { start() { console.log('start', arguments)} }
  console.log('createSoundtouchSource', args, thing)
  return thing
}
