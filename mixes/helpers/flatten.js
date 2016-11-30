const { reduce, keyBy, isEmpty } = require('lodash')

module.exports = flatten

function flatten (mix) {
  const channels = flattenChannels(mix.channel)

  return {
    id: mix.id,
    channelId: mix.channel.id,
    channels,
    clips: flattenClips(channels)
  }
}

function flattenChannels (channel) {
  const { channels: children } = channel

  if (isEmpty(children)) {
    return { [channel.id]: channel }
  }

  return {
    [channel.id]: {
      ...channel,
      channels: children.map(child => child.id)
    },
    ...children.reduce((sofar, next) => {
      return { ...sofar, ...flattenChannels(next) }
    }, {})
  }
}

function flattenClips (channels) {
  return reduce(channels, (sofar, next) => {
    const { clips: nextClips = [] } = next
    return { ...sofar, ...keyBy(nextClips, 'id') }
  }, {})
}
