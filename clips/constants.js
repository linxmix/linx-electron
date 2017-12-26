const { values, merge } = require('lodash')

const clipsHash = {
  CLIP_TYPE_SAMPLE: 'sample-clip',
  CLIP_TYPE_AUTOMATION: 'automation-clip',
  CLIP_TYPE_TEMPO: 'tempo-clip'
}
const CLIP_TYPES = values(clipsHash)

const controlsHash = {
  CONTROL_TYPE_GAIN: 'gain',
  CONTROL_TYPE_LOW_BAND: 'low-band',
  CONTROL_TYPE_MID_BAND: 'mid-band',
  CONTROL_TYPE_HIGH_BAND: 'high-band',
  CONTROL_TYPE_FILTER_HIGHPASS_CUTOFF: 'filter-highpass-cutoff',
  CONTROL_TYPE_FILTER_HIGHPASS_Q: 'filter-highpass-q',
  CONTROL_TYPE_FILTER_LOWPASS_CUTOFF: 'filter-lowpass-cutoff',
  CONTROL_TYPE_FILTER_LOWPASS_Q: 'filter-lowpass-q',
  CONTROL_TYPE_DELAY_WET: 'delay-wet',
  CONTROL_TYPE_DELAY_CUTOFF: 'delay-cutoff',
  CONTROL_TYPE_REVERB: 'reverb',
  CONTROL_TYPE_PITCH: 'pitch',
}

const CONTROL_TYPES = values(controlsHash)

module.exports = merge(clipsHash, controlsHash, { CLIP_TYPES, CONTROL_TYPES })
