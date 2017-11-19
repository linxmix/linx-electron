/* global SoundTouch:true */
/* global FifoSampleBuffer:true */
/* global SimpleFilter:true */
const AudioWorkerNode = require('audio-worker-node')
const { assign } = require('lodash')

const { isValidNumber, validNumberOrDefault } = require('../../lib/number-utils')

const MAX_BUFFER_SIZE = 16384
const BUFFER_SIZE = MAX_BUFFER_SIZE / 8
const SAMPLE_DRIFT_TOLERANCE = 512
const CHANNEL_COUNT = 2

//
// Fix bugs with SoundTouch library
//
// Augment SoundTouch
SoundTouch.prototype.clearBuffers = function () {
  this.inputBuffer.clear()
  this._intermediateBuffer.clear()
  this.outputBuffer.clear()
}

// fix bug (?)
SoundTouch.prototype.getSampleReq = function () {
  return this.tdStretch.sampleReq
}

// fix bug by adding `this.`
SoundTouch.prototype.clear = function () {
  this.rateTransposer.clear()
  this.tdStretch.clear()
}

// fix bug by adding `this.`
FifoSampleBuffer.prototype.clear = function () {
  this.receive(this.frameCount)
  this.rewind()
}

//
//  Add SoundTouch + Virtual Audio Graph integration. exposes:
//  [function] createSoundtouchSource(audioContext)
//
export function SoundtouchBufferSource (buffer) {
  this.buffer = buffer
}

SoundtouchBufferSource.prototype = {
  extract: function (target, numFrames, position) {
    const l = this.buffer.getChannelData(0)

    if (this.buffer.numberOfChannels >= 2) {
      const r = this.buffer.getChannelData(1)
      for (let i = 0; i < numFrames; i++) {
        target[i * 2] = l[i + position]
        target[i * 2 + 1] = r[i + position]
      }

    // buffer is mono
    } else {
      for (let i = 0; i < numFrames; i++) {
        target[i * 2] = l[i + position]
        target[i * 2 + 1] = l[i + position]
      }
    }
    return Math.min(numFrames, l.length - position)
  }
}

function onaudioprocess ({
  type,
  inputs,
  outputs,
  parameters,
  playbackTime,
  node: processor
}) {
  const node = processor.node
  const filter = node.filter

  if (!filter) { return }

  // outputs is array of arrays of outputs
  const l = outputs[0][0]
  const r = outputs[0][1]

  const pitch = parameters.pitch && _arrayAverage(parameters.pitch)
  const tempo = parameters.tempo && _arrayAverage(parameters.tempo)

  const soundtouch = node.soundtouch

  if (isValidNumber(pitch)) {
    soundtouch.pitchSemitones = pitch
  }
  if (isValidNumber(tempo)) {
    soundtouch.tempo = tempo
  }

  // calculate how many frames to extract based on isPlaying
  const isPlaying = parameters.isPlaying || []
  const bufferSize = l.length

  let extractFrameCount = 0
  for (let i = 0; i < isPlaying.length; i++) {
    extractFrameCount += isPlaying[i]
  }

  // if playing, calculate expected vs actual position
  if (extractFrameCount !== 0) {
    const actualElapsedSamples = Math.max(0, filter.position + extractFrameCount)

    // i think this does not depend on tempo because the filter output is already scaled correctly
    const elapsedTime = Math.min(playbackTime, node.stopTime) - node.startTime

    const expectedElapsedSamples = Math.max(0, elapsedTime * node.sampleRate - bufferSize)
    const sampleDelta = ~~(expectedElapsedSamples - actualElapsedSamples)

    // if we've drifed past tolerance, adjust frames to extract
    if (Math.abs(sampleDelta) >= SAMPLE_DRIFT_TOLERANCE) {
      // console.log('actualElapsedSamples', actualElapsedSamples);
      // console.log('expectedElapsedSamples', expectedElapsedSamples);
      console.log("DRIFT", sampleDelta, elapsedTime)
      console.log({ playbackTime, 'startSample': node.filter.startSample, tempo, elapsedTime, 'startTime': node.startTime, actualElapsedSamples, expectedElapsedSamples });

      // if we're behind where we should be, extract dummy frames to catch up
      if (sampleDelta > 0) {
        const dummySamples = new Float32Array(sampleDelta * CHANNEL_COUNT)
        filter.extract(dummySamples, sampleDelta)

      // if we're ahead of where we should be, rewind
      } else if (sampleDelta < 0) {
        filter.position += sampleDelta
      }
    }
  }

  const samples = new Float32Array(BUFFER_SIZE * CHANNEL_COUNT)
  extractFrameCount > 0 ? filter.extract(samples, extractFrameCount) : 0

  // map extracted frames onto output
  let filterFrame = 0
  for (let i = 0; i < bufferSize; i++) {
    l[i] = (samples[filterFrame * 2] * isPlaying[i]) || 0
    r[i] = (samples[filterFrame * 2 + 1] * isPlaying[i]) || 0
    filterFrame += isPlaying[i]
  }
};

module.exports = function (audioContext) {
  const processor = {}
  const node = new AudioWorkerNode(audioContext, onaudioprocess, {
    numberOfInputs: 2,
    numberOfOutputs: 2,
    bufferLength: BUFFER_SIZE,
    dspBufLength: BUFFER_SIZE,
    processor,
    parameters: [
      {
        name: 'pitch',
        defaultValue: 0
      },
      {
        name: 'tempo',
        defaultValue: 1
      },
      {
        name: 'isPlaying',
        defaultValue: 0
      }
    ]
  })
  processor.node = node

  Object.defineProperty(node, 'buffer', {
    get () {
      return this._buffer
    },
    set (buffer) {
      this._buffer = buffer
      this.source = new SoundtouchBufferSource(buffer)
      this.filter = new SimpleFilter(this.source, this.soundtouch)
      this.filter.sourcePosition = this.startSample
      this.filter.startSample = this.startSample
    }
  })

  return assign(node, {
    audioContext,
    soundtouch: new SoundTouch(),

    _buffer: null,
    filter: null,
    source: null,
    startSample: 0,
    sampleRate: null,
    startTime: null,
    stopTime: null,

    start (startTime, offsetTime) {
      if (!isValidNumber(startTime)) {
        console.warn('Invalid startTime given to soundtouchNode.start', startTime)
        return
      }

      const audioContext = this.audioContext
      offsetTime = validNumberOrDefault(offsetTime, 0)

      const sampleRate = this.sampleRate = audioContext.sampleRate || 44100
      this.startSample = ~~(offsetTime * sampleRate)

      this.isPlaying.setValueAtTime(1, startTime)

      // update filter if we have one
      if (this.filter) {
        this.filter.sourcePosition = this.startSample
      }
    },

    stop (stopTime) {
      stopTime = Math.max(0, validNumberOrDefault(stopTime, this.audioContext.currentTime))
      this.isPlaying.setValueAtTime(0, stopTime)
    }
  })
}

function _arrayAverage(arr) {
  let total = 0
  for (let i = 0; i < arr.length; i++) {
    total += arr[i]
  }
  return total / arr.length
}
