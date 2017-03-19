const { filter, map, find } = require('lodash')
const {
  CHANNEL_TYPE_PRIMARY_TRACK,
  CHANNEL_TYPE_TRANSITION
} = require('../../channels/constants')

module.exports = {
  getPrimaryTracks
}

function getPrimaryTracks (nestedChannel = {}, metas = []) {
  const allChannels = nestedChannel.channels || []
  const primaryTrackChannels = filter(allChannels, { type: CHANNEL_TYPE_PRIMARY_TRACK })

  return map(primaryTrackChannels, (channel, i) => {
    const clips = channel.clips
    const sampleId = clips[0] && clips[0].sampleId

    return {
      id: channel.id,
      channel,
      transition: find(channel.channels || [], { type: CHANNEL_TYPE_TRANSITION }),
      index: i,
      meta: metas[sampleId] || {}
    }
  })
}
