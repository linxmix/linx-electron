const { values, merge } = require('lodash')

const clipsHash = {
  CLIP_TYPE_SAMPLE: 'sample-clip',
  CLIP_TYPE_AUTOMATION: 'automation-clip'
}
const CLIP_TYPES = values(clipsHash)

const controlsHash = {
  CONTROL_TYPE_GAIN: 'gain'
}

const CONTROL_TYPES = values(controlsHash)

module.exports = merge(clipsHash, controlsHash, { CLIP_TYPES, CONTROL_TYPES })
