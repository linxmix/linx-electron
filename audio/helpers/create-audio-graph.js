const { map, merge, forEach } = require('lodash')

const createSoundtouchSource = require('./create-soundtouch-source')

module.exports = createAudioGraph

function createAudioGraph ({ channel, audioContext, outputs = 'output' }) {
  const { channels: nestedChannels = [] } = channel
  const { currentTime } = audioContext

  audioContext.createSoundtouchSource = () => createSoundtouchSource(audioContext)

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
    let startTime = currentTime, endTime, offsetTime

    switch(clip.sample.meta.title) {
      case 'I Could Be the One (Original Mix)':
        startTime = currentTime;
        offsetTime = 0.07503117913832208;
        break;
      case 'Alive':
        startTime = currentTime;
        offsetTime = 0.009240362811791386;
        break;
    }

    audioGraph[clip.id] = ['soundtouchSource', channel.id, {
      buffer: clip.sample.audioBuffer,
      startTime,
      offsetTime,
      stopTime: currentTime + 100
    }]
  })

  return merge(audioGraph, ...nestedAudioGraphs)
}
