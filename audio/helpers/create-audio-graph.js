const { map, merge, forEach } = require('lodash')

const createSoundtouchSource = require('./create-soundtouch-source')
const { PLAY_STATE_PLAYING } = require('../constants')
const { beatToTime, validNumberOrDefault } = require('../../lib/number-utils')

module.exports = createAudioGraph

function createAudioGraph ({ channel, audioContext, outputs = 'output', playState, startBeat }) {
  startBeat = validNumberOrDefault(startBeat, 0)
  const { channels: nestedChannels = [] } = channel
  const { currentTime } = audioContext

  audioContext.createSoundtouchSource = () => createSoundtouchSource(audioContext)

  const nestedAudioGraphs = map(nestedChannels, (nestedChannel, i) =>
    createAudioGraph({
      channel: nestedChannel,
      audioContext,
      playState,
      startBeat: startBeat + validNumberOrDefault(nestedChannel.startBeat, 0),
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

  // TODO: pass this in from reducer, computed from masterChannel beatGrid
  function _beatToTime(beat) {
    return beatToTime(beat, 128)
  }

  forEach(channel.clips, clip => {

    // TODO: how does web audio playback work?
    //       if i specify a time in the past, does it auto correct offsetTime?
    // const absClipStartTime = Math.max(playState.absSeekTime + clipStartTime, audioContext.currentTime);

    const clipStartBeat = startBeat + clip.startBeat
    const clipEndBeat = clipStartBeat + clip.beatCount

    let startTime, stopTime, offsetTime
    if (clipStartBeat >= playState.seekBeat) {

      startTime = _beatToTime(clipStartBeat - playState.seekBeat)
      stopTime = _beatToTime(clipEndBeat - playState.seekBeat)
      offsetTime = clip.audioStartTime
    } else {
      // // curate args
      // if (offsetTime < 0) {
      //   startTime -= offsetTime;
      //   offsetTime = 0;
      // }
    }
    console.log({
      name: clip.sample.meta.title,
      clipStartBeat, clipEndBeat, 'playState.seekBeat': playState.seekBeat,
      startTime, stopTime, offsetTime
    })

    if (playState.status === PLAY_STATE_PLAYING) {
      audioGraph[clip.id] = ['soundtouchSource', channel.id, {
        buffer: clip.sample.audioBuffer,
        offsetTime,
        startTime: playState.absSeekTime + startTime,
        stopTime: playState.absSeekTime + stopTime
      }]
    }
  })

  return merge(audioGraph, ...nestedAudioGraphs)
}
