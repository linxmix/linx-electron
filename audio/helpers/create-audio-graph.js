const { map, merge, forEach } = require('lodash')

const createSoundtouchSource = require('./create-soundtouch-source')
const { PLAY_STATE_PLAYING } = require('../constants')
const { validNumberOrDefault } = require('../../lib/number-utils')
const beatToTime = require('./beat-to-time')
const getValueCurve = require('./get-value-curve')

module.exports = createAudioGraph

function createAudioGraph ({ channel, audioContext, outputs = 'output', playState,
  startBeat, beatScale }) {

  startBeat = validNumberOrDefault(startBeat, 0)
  const { channels: nestedChannels = [] } = channel
  const { currentTime } = audioContext

  audioContext.createSoundtouchSource = () => createSoundtouchSource(audioContext)

  const nestedAudioGraphs = map(nestedChannels, (nestedChannel, i) =>
    createAudioGraph({
      channel: nestedChannel,
      audioContext,
      playState,
      beatScale,
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

  forEach(channel.clips, clip => {
    const clipStartBeat = startBeat + clip.startBeat
    const clipEndBeat = clipStartBeat + clip.beatCount

    let startTime = beatToTime(beatScale, clipStartBeat - playState.seekBeat)
    const stopTime = beatToTime(beatScale, clipEndBeat - playState.seekBeat)
    let offsetTime = clip.audioStartTime
    if (startTime < 0) {
      offsetTime -= startTime;
      startTime = 0;
    }
    
    console.log({
      name: clip.sample.meta.title,
      clipStartBeat, clipEndBeat, 'playState.seekBeat': playState.seekBeat,
      startTime, stopTime, offsetTime
    })

    if (playState.status === PLAY_STATE_PLAYING && stopTime > startTime) {
      const tempoScale = _getTempoScale()
      const tempoCurve = getValueCurve({ scale: tempoScale, beatCount: clip.beatCount })

      audioGraph[clip.id] = ['soundtouchSource', channel.id, {
        buffer: clip.sample.audioBuffer,
        offsetTime,
        startTime: playState.absSeekTime + startTime,
        stopTime: playState.absSeekTime + stopTime,
        tempo: ['setValueCurveAtTime', tempoCurve, stopTime - startTime]
      }]
    }
  })

  return merge(audioGraph, ...nestedAudioGraphs)
}

function _getTempoScale() {
  // TODO: compute tempo scale from mix beatScale and clip.meta.bpm
  // tempo: Ember.computed('syncBpm', 'audioBpm', function() {
  //   const syncBpm = this.get('syncBpm');
  //   const audioBpm = this.get('audioBpm');

  //   return (isValidNumber(syncBpm) && isValidNumber(audioBpm)) ? (syncBpm / audioBpm) : 1;
  // }),
}
