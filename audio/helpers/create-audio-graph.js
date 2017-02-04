const { map, merge, forEach } = require('lodash')

module.exports = createAudioGraph

function createAudioGraph ({ channel, audioContext, outputs = 'output' }) {
  const { channels: nestedChannels = [] } = channel
  const { currentTime } = audioContext

  const nestedAudioGraphs = map(nestedChannels, (nestedChannel, i) =>
    createAudioGraph({
      channel: nestedChannel,
      audioContext,
      outputs: { key: channel.id, outputs: [i], inputs: [0] }
    })
  )

  // TODO:
  // create clip nodes (soundtouch source node)
  // create FX chain
  // add automations

  const audioGraph = {
    // NOTE: virtual-audio-graph interprets numberOfOutputs here as the # of merger inputs
    [channel.id]: ['channelMerger', outputs, { numberOfOutputs: nestedChannels.length }],
  }

  forEach(channel.clips, clip => {
    audioGraph[clip.id] = ['oscillator', channel.id, {
      type: 'square',
      frequency: 440,
      startTime: currentTime + 1,
      stopTime: currentTime + 2
    }]
  })

  return merge(audioGraph, ...nestedAudioGraphs)
}
