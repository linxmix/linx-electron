const { map, merge, forEach } = require('lodash')

const createSoundtouchSource = require('./create-soundtouch-source')
const { PLAY_STATE_PLAYING } = require('../constants')

module.exports = createAudioGraph

function createAudioGraph ({ channel, audioContext, outputs = 'output', playState }) {
  const { channels: nestedChannels = [] } = channel
  const { currentTime } = audioContext

  audioContext.createSoundtouchSource = () => createSoundtouchSource(audioContext)

  const nestedAudioGraphs = map(nestedChannels, (nestedChannel, i) =>
    createAudioGraph({
      channel: nestedChannel,
      audioContext,
      playState,
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
    // TODO: compute clipStartTime as beatToAbsTime(clip.startBeat)
    //       then compute clipOffsetTime from playState.seekBeat, clip.audioStartTime
      // let startTime = Math.max(this.getAbsoluteTime(), this.getAbsoluteStartTime());
      // let offsetTime = this.getCurrentAudioTime();
      // const endTime = this.getAbsoluteEndTime();

      // // curate args
      // if (offsetTime < 0) {
      //   startTime -= offsetTime;
      //   offsetTime = 0;
      // }


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

    if (playState.status === PLAY_STATE_PLAYING) {
      audioGraph[clip.id] = ['soundtouchSource', channel.id, {
        buffer: clip.sample.audioBuffer,
        startTime,
        offsetTime,
        stopTime: currentTime + 100
      }]
    }
  })

  return merge(audioGraph, ...nestedAudioGraphs)
}
