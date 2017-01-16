const { values, merge } = require('lodash')

const channelsHash = {
  CHANNEL_TYPE_PRIMARY_TRACK: 'primary-track',
  CHANNEL_TYPE_SAMPLE_TRACK: 'sample-track',
  CHANNEL_TYPE_TRANSITION: 'transition',
  CHANNEL_TYPE_MIX: 'mix'
}
const CHANNEL_TYPES = values(channelsHash)

module.exports = merge(channelsHash, { CHANNEL_TYPES })
