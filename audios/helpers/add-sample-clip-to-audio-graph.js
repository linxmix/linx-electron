const d3 = require('d3')
const { map, filter } = require('lodash')

const { PLAY_STATE_PLAYING } = require('../constants')
const valueScaleToAudioParameter = require('./value-scale-to-audio-parameter')
const {
  isValidNumber,
  beatToTime
} = require('../../lib/number-utils')

module.exports = function ({ outputs, startBeat, audioGraph, clip, playState,
  bpmScale, beatScale, currentBeat, currentTime, pitchSemitones }) {
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
    beatScale,
    bpmScale,
    audioBpm,
    clipStartBeat,
    clipEndBeat
  })

  // this is in raw audio frame of reference
  // currently not used anywhere
  // const timeScale = d3.scaleLinear()
  //   .domain(tempoScale.domain())
  //   .range(tempoScale.domain().map(beat => beatToTime(beat, audioBpm) / clip.sample.audioBuffer.duration))

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
    pitch: ['setValueAtTime', pitchSemitones, 0]
  }]
}

// convert from beat=>bpm scale, in mix frame of reference, to time=>tempo scale, in clip frame of reference
function _getSampleClipTempoScale ({ clip, startBeat, beatScale, bpmScale, audioBpm, clipStartBeat, clipEndBeat }) {
  const beatScaleDomainWithinClip = filter(beatScale.domain(),
    beat => (beat > clipStartBeat && beat < clipEndBeat))
  const clipStartTime = beatScale(clipStartBeat)

  const tempoScaleDomain = [0]
    .concat(map(beatScaleDomainWithinClip, beat => beatScale(beat) - clipStartTime))
    .concat(beatScale(clipEndBeat) - clipStartTime)

  const tempoScaleRange = map(tempoScaleDomain, time => {
    const syncBpm = bpmScale(beatScale.invert(time + clipStartTime))
    return (isValidNumber(syncBpm) && isValidNumber(audioBpm)) ? (syncBpm / audioBpm) : 1
  })

  return d3.scaleLinear()
    .domain(tempoScaleDomain)
    .range(tempoScaleRange)
    .clamp(true)
}
