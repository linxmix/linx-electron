const { filter, sortBy } = require('lodash')
const { CHANNEL_TYPE_PRIMARY_TRACK } = require('../../channels/constants')

module.exports = {
  getPrimaryTracks
}

function getPrimaryTracks (nestedChannel = {}, metas = []) {
  const allChannels = nestedChannel.channels || []
  const primaryTrackChannels = filter(allChannels, { type: CHANNEL_TYPE_PRIMARY_TRACK })

  return sortBy(primaryTrackChannels, ['startBeat', 'id']).map(channel => {
    const clips = channel.clips
    const sampleId = clips[0] && clips[0].sampleId

    return {
      id: sampleId,
      channel,
      meta: metas[sampleId] || {}
    }
  })
}
