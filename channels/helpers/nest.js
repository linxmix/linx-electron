const { includes, some, every } = require('lodash')

module.exports = nestChannels

function nestChannels ({ channelId, channels, clips, dirtyChannels = [] }) {
  const channel = channels[channelId] || {}
  const { id, type, startBeat, channelIds: childChannelIds = [], clipIds = [] } = channel

  const childChannels = childChannelIds.map(childChannelId => {
    return nestChannels({ channelId: childChannelId, channels, clips, dirtyChannels })
  })
  const childClips = clipIds.map(clipId => (clips[clipId] || {}))

  let status = 'unloaded'
  if (some(childChannels, { status: 'loading' }) || some(childClips, { status: 'loading' })) {
    status = 'loading'
  } else if (every(childChannels, { status: 'loaded' }) && every(childClips, { status: 'loaded' })) {
    status = 'loaded'
  }

  return {
    id,
    type,
    startBeat,
    status,
    isDirty: (includes(dirtyChannels, id) ||
      some(childChannels, { isDirty: true }) ||
      some(childClips, { isDirty: true })),
    channels: childChannels,
    clips: childClips
  }
}
