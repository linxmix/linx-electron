const d3 = require('d3')
const { map, filter } = require('lodash')

const { PLAY_STATE_PLAYING } = require('../constants')
const valueScaleToAudioParameter = require('./value-scale-to-audio-parameter')
const {
  isValidNumber,
  beatToTime
} = require('../../lib/number-utils')

module.exports = function ({ outputs, startBeat, audioGraph, clip, playState,
  bpmScale, beatScale, currentBeat, currentTime }) {
  const clipStartBeat = startBeat + clip.startBeat
  const clipEndBeat = clipStartBeat + clip.beatCount
  const audioBpm = clip.sample.meta.bpm

  // if not playing or seek is beyond clip, stop here
  if ((playState.status !== PLAY_STATE_PLAYING) ||
    (currentBeat > clipEndBeat)) {
    return
  }

  const tempoScale = _getSampleClipTempoScale({
    clip,
    bpmScale,
    audioBpm,
    startBeat: clipStartBeat,
    endBeat: clipEndBeat
  })

  // this is in raw audio frame of reference
  const timeScale = d3.scaleLinear()
    .domain(tempoScale.domain())
    .range(tempoScale.domain().map(beat => beatToTime(beat, audioBpm) / clip.sample.audioBuffer.duration))

  let startTime = beatScale(clipStartBeat) - beatScale(currentBeat)
  let offsetTime = clip.audioStartTime
  const stopTime = beatScale(clipEndBeat) - beatScale(currentBeat)

  // if seek in middle of clip, start now and adjust offsetTime
  if (currentBeat > clipStartBeat) {
    startTime = 0
    offsetTime += beatToTime(currentBeat - clipStartBeat, audioBpm)
  }

  console.log('addSampleClipToAudioGraph', {
    name: clip.sample.meta.title,
    clipStartBeat,
    clipEndBeat,
    currentBeat,
    startTime,
    stopTime,
    offsetTime,
    audioBpm: clip.sample.meta.bpm,
    'tempoScale.domain': tempoScale.domain(),
    'tempoScale.range': tempoScale.range(),
    'timeScale.domain': timeScale.domain(),
    'timeScale.range': timeScale.range(),
  })

  audioGraph[clip.id] = ['soundtouchSource', outputs, {
    buffer: clip.sample.audioBuffer,
    offsetTime,
    startTime: currentTime + startTime,
    stopTime: currentTime + stopTime,
    tempo: valueScaleToAudioParameter({
      clip,
      currentBeat,
      beatScale,
      currentTime,
      startBeat,
      valueScale: tempoScale
    }),
    // time: valueScaleToAudioParameter({
    //   clip,
    //   currentBeat,
    //   beatScale,
    //   currentTime,
    //   startBeat,
    //   valueScale: timeScale
    // })
  }]
}

// convert from bpm scale, in mix frame of reference, to tempo scale, in clip frame of reference
function _getSampleClipTempoScale ({ clip, bpmScale, audioBpm, startBeat, endBeat }) {
  const bpmScaleDomainWithinClip = filter(bpmScale.domain(), beat => (beat > startBeat && beat < endBeat))

  const tempoScaleDomain = [0]
    .concat(map(bpmScaleDomainWithinClip, beat => beat - startBeat))
    .concat([clip.beatCount])

  const tempoScaleRange = map(tempoScaleDomain, beat => {
    const syncBpm = bpmScale(beat + startBeat)
    return (isValidNumber(syncBpm) && isValidNumber(audioBpm)) ? (syncBpm / audioBpm) : 1
  })

  return d3.scaleLinear()
    .domain(tempoScaleDomain)
    .range(tempoScaleRange)
}
