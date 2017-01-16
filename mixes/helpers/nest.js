module.exports = nest

function nest (mix) {
  const { id, channelId, channels, clips } = mix

  return {
    id,
    channel: nestChannels({ channelId, channels, clips })
  }
}

function nestChannels ({ channelId, channels, clips }) {
  const channel = channels[channelId] || {}
  const { id, type, channelIds: subChannelIds = [], clipIds = [] } = channel

  return {
    id,
    type,
    channels: subChannelIds.map(subChannelId => {
      return nestChannels({ channelId: subChannelId, channels, clips })
    }),
    clips: clipIds.map(clipId => clips[clipId])
  }
}
