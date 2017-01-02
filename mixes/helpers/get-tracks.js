const { filter } = require('lodash')
const { CHANNEL_TYPE_PRIMARY_TRACK } = require('../../channels/constants')

module.exports = {
  getPrimaryTracks
}

function getPrimaryTracks (mix, metas) {
  const allChannels = (mix && mix.channel && mix.channel.channels) || []
  const primaryTrackChannels = filter(allChannels, { type: CHANNEL_TYPE_PRIMARY_TRACK })

  return primaryTrackChannels.map((channel) => {
    const clips = channel.clips
    const sampleId = clips[0] && clips[0].sampleId

    return {
      id: sampleId,
      meta: metas[sampleId]
    }
  })
}
