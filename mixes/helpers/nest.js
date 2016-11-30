module.exports = nest

function nest (mix) {
  const { id, channelId, channels } = mix

  return {
    id,
    channel: nestChannels({ channelId, channels })
  }
}

function nestChannels ({ channelId, channels }) {
  const channel = channels[channelId]
    console.log('channel', channel, channelId)
  const { channels: children = [] } = channel

  return {
    ...channel,
    channels: children.map(child => {
      return nestChannels({ channelId: child, channels })
    })
  }
}
