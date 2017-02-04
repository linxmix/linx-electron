const { map, merge, forEach } = require('lodash')

module.exports = createAudioGraph

function createAudioGraph ({ channel, audioContext, outputs = 'output' }) {
  const { channels: nestedChannels = [] } = channel
  const { currentTime } = audioContext

  const nestedAudioGraphs = map(nestedChannels, (nestedChannel, i) =>
    createAudioGraph({
      channel: nestedChannel,
      audioContext,
      outputs: { key: channel.id } // outputs: [0], inputs: [i]
    })
  )

  // create clip nodes
  // create FX chain
  // create channel merge input (how many inputs?)

  const audioGraph = {
    [channel.id]: ['channelMerger', outputs, { numberOfInputs: nestedChannels.length }],
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
