const { reduce, keyBy } = require('lodash')

module.exports = flatten

function flatten (mix) {
  const { id, channel } = mix

  return {
    id,
    channelId: channel.id,
    channels: flattenChannels(channel),
    clips: flattenClips(channel)
  }
}

function reduceChannelsToObject (channel, callback) {
  const { channels: subChannels = [] } = channel

  return {
    ...callback(channel),
    ...reduce(subChannels, (sofar, subChannel) => {
      return { ...sofar, ...reduceChannelsToObject(subChannel, callback) }
    }, {})
  }
}

function flattenChannels (channel) {
  return reduceChannelsToObject(channel, (next) => {
    const { channels = [], clips = [] } = next
    return {
      [next.id]: {
        ...next,
        channelIds: channels.map(channel => channel.id),
        clipIds: clips.map(clip => clip.id)
      }
    }
  })
}

function flattenClips (channel) {
  return reduceChannelsToObject(channel, (next) => {
    const { clips = [] } = next
    return keyBy(clips, 'id')
  })
}
