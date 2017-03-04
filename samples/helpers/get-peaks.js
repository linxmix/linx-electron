const assert = require('assert')

const { isValidNumber, validNumberOrDefault } = require('../../lib/number-utils')

const SAMPLE_RATE = 44100
const BEAT_OFFSET = 45.0 / 1000.0

module.exports = getPeaks

// TODO: add caching? here or in store?
// returns an array of arrays of [ymin, ymax] values of the waveform
//  from startTime to endTime when broken into length subranges
function getPeaks ({ audioBuffer, startTime, endTime, length }) {
  // console.log('getPeaks', { audioBuffer, startTime, endTime, length })
  assert(audioBuffer, 'Must provide audioBuffer to getPeaks')
  assert(isValidNumber(length), 'Must provide length to getPeaks')

  startTime = Math.max(validNumberOrDefault(startTime, 0), 0)
  endTime = validNumberOrDefault(endTime, audioBuffer.duration)

  // const cacheKey = `startTime:${startTime},endTime:${endTime},length:${length},audioBufferDuration:${audioBuffer.duration}`;
  // const peaksCache = this.get('_peaksCache');
  // const cached = peaksCache.get(cacheKey);

  // if (cached) {
  //   // Ember.Logger.log('AudioBinary.getPeaks cache hit', startTime, endTime, length);
  //   return cached;
  // }


  // TODO(FUTURE): update to use multiple channels
  // TODO(FUTURE): job.spawn still helpful?
  const peaks = _calculatePeaks({
    length,
    samples: audioBuffer.getChannelData(0),
    startSample: startTime * audioBuffer.sampleRate,
    endSample: endTime * audioBuffer.sampleRate
  })

  // peaksCache.set(cacheKey, peaks);

  return peaks
}

function _calculatePeaks({ length, samples, startSample, endSample }) {
  const sampleSize = (endSample - startSample) / length;
  const sampleStep = ~~(sampleSize / 10) || 1; // reduce granularity with small length
  const peaks = [];

  for (let i = 0; i < length; i++) {
    const start = ~~(startSample + i * sampleSize);
    const end = ~~(start + sampleSize);
    let min = samples[start] || 0;
    let max = samples[start] || 0;

    // calculate max and min in this sample
    for (let j = start; j < end; j += sampleStep) {
      const value = samples[j] || 0;

      if (value > max) {
        max = value;
      }
      if (value < min) {
        min = value;
      }
    }

    // add to peaks
    peaks[i] = [min, max];
  }

  return peaks
}
