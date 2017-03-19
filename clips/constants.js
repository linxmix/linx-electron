const { values, merge } = require('lodash')

const clipsHash = {
  CLIP_TYPE_SAMPLE: 'sample-clip',
  CLIP_TYPE_AUTOMATION: 'automation-clip'
}
const CLIP_TYPES = values(clipsHash)

module.exports = merge(clipsHash, { CLIP_TYPES })
