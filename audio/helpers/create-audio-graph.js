const { map, merge, forEach, filter } = require('lodash')
const d3 = require('d3')

const createSoundtouchSource = require('./create-soundtouch-source')
const { PLAY_STATE_PLAYING } = require('../constants')
const getValueCurve = require('./get-value-curve')
const {
  validNumberOrDefault,
  isValidNumber,
  beatToTime
} = require('../../lib/number-utils')

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

  audioContext.createSoundtouchSource = () => createSoundtouchSource(audioContext)

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
      tempoScale,
      tempoCurve,
      audioBpm: clip.sample.meta.bpm
    })

    audioGraph[clip.id] = ['soundtouchSource', channel.id, {
      buffer: clip.sample.audioBuffer,
      offsetTime,
      startTime: playState.absSeekTime + startTime,
      stopTime: playState.absSeekTime + stopTime,
      tempo: ['setValueCurveAtTime', tempoCurve, playState.absSeekTime + startTime, stopTime - startTime]
    }]
  })

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
