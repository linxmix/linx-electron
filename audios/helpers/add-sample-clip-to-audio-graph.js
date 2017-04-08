const d3 = require('d3')
const { map, filter } = require('lodash')

const { PLAY_STATE_PLAYING } = require('../constants')
const getValueCurve = require('./get-value-curve')
const {
  isValidNumber,
  beatToTime
} = require('../../lib/number-utils')

module.exports = function ({ outputs, startBeat, audioGraph, clip, playState,
  bpmScale, beatScale }) {
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

  let startTime = beatScale(clipStartBeat) - beatScale(playState.seekBeat)
  let offsetTime = clip.audioStartTime
  const stopTime = beatScale(clipEndBeat) - beatScale(playState.seekBeat)

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
    audioBpm: clip.sample.meta.bpm
  })

  audioGraph[clip.id] = ['soundtouchSource', outputs, {
    buffer: clip.sample.audioBuffer,
    offsetTime,
    startTime: playState.absSeekTime + startTime,
    stopTime: playState.absSeekTime + stopTime,
    tempo: ['setValueCurveAtTime', tempoCurve, playState.absSeekTime + startTime, stopTime - startTime]
  }]
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
