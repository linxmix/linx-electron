const { filter, map, find, get } = require('lodash')
const {
  CHANNEL_TYPE_PRIMARY_TRACK,
  CHANNEL_TYPE_TRANSITION,
  CHANNEL_TYPE_SAMPLE_TRACK
} = require('../../channels/constants')
const { CLIP_TYPE_SAMPLE } = require('../../clips/constants')

module.exports = {
  getPrimaryTracks
}

function getPrimaryTracks (nestedChannel = {}, metas = []) {
  const allChannels = nestedChannel.channels || []
  const primaryTrackChannels = filter(allChannels, { type: CHANNEL_TYPE_PRIMARY_TRACK })

  return map(primaryTrackChannels, (channel, i) => {
    const clips = channel.clips
    const sampleChannel = find(channel.channels || [], { type: CHANNEL_TYPE_SAMPLE_TRACK })
      || {}
    const sampleClip = find(sampleChannel.clips || [], { type: CLIP_TYPE_SAMPLE }) || {}
    const sampleId = get(sampleClip, 'sampleId')

    return {
      id: channel.id,
      channel,
      transition: find(channel.channels || [], { type: CHANNEL_TYPE_TRANSITION }),
      index: i,
      meta: metas[sampleId] || {}
    }
  })
}
