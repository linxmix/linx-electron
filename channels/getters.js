const { createSelector: Getter } = require('reselect')
const { mapValues } = require('lodash')

const { getClips } = require('../clips/getters')
const nestChannel = require('./helpers/nest')

const getChannelsRecords = (state) => state.channels.records
const getChannelsDirty = (state) => state.channels.dirty

const getChannels = Getter(
  getClips,
  getChannelsRecords,
  getChannelsDirty,
  (clips, channels, dirtyChannels) => mapValues(channels, channel => nestChannel({
    channelId: channel.id,
    channels,
    dirtyChannels,
    clips
  }))
)

module.exports = {
  getChannels
}
