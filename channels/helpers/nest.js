const { includes, some, every, map, concat } = require('lodash')

const { validNumberOrDefault } = require('../../lib/number-utils')

module.exports = nestChannels

function nestChannels ({ channelId, channels, clips, dirtyChannels = [] }) {
  const channel = channels[channelId] || {}
  const { id, type, startBeat, channelIds: childChannelIds = [], clipIds = [] } = channel

  // compute children
  const childChannels = childChannelIds.map(childChannelId => {
    return nestChannels({ channelId: childChannelId, channels, clips, dirtyChannels })
  })
  const childClips = clipIds.map(clipId => (clips[clipId] || {}))

  // compute status
  let status = 'unloaded'
  if (some(childChannels, { status: 'loading' }) || some(childClips, { status: 'loading' })) {
    status = 'loading'
  } else if (every(childChannels, { status: 'loaded' }) && every(childClips, { status: 'loaded' })) {
    status = 'loaded'
  }

  // compute beatCount
  const beatCount = Math.max.apply(Math, map(
    concat(childChannels, childClips),
    ({ startBeat, beatCount }) => startBeat + beatCount,
  ))

  return {
    id,
    type,
    status,
    beatCount,
    startBeat: validNumberOrDefault(startBeat, 0),
    isDirty: (includes(dirtyChannels, id) ||
      some(childChannels, { isDirty: true }) ||
      some(childClips, { isDirty: true })),
    channels: childChannels,
    clips: childClips
  }
}
