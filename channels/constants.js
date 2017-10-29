const { values, merge } = require('lodash')

const channelsHash = {
  CHANNEL_TYPE_PRIMARY_TRACK: 'primary-track-channel',
  CHANNEL_TYPE_SAMPLE_TRACK: 'sample-track-channel',
  CHANNEL_TYPE_TRACK_GROUP: 'track-group-channel',
  CHANNEL_TYPE_MIX: 'mix'
}
const CHANNEL_TYPES = values(channelsHash)

module.exports = merge(channelsHash, { CHANNEL_TYPES })
