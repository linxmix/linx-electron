const { includes, some, every, map, concat, sortBy } = require('lodash')
const d3 = require('d3')

const { validNumberOrDefault, beatToTime } = require('../../lib/number-utils')

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

  // TODO: update to use BPM automation, and only show on master channel(?)
  const bpm = validNumberOrDefault(channel.bpm, 0)
  const bpmScale = d3.scaleLinear()
    .domain([0, beatCount])
    .range([bpm, bpm])

  const beatScale = d3.scaleLinear()
    .domain([0, beatCount])
    .range([0, beatToTime(beatCount, bpm)])


  return {
    id,
    type,
    status,
    beatCount,
    beatScale,
    bpmScale,
    startBeat: validNumberOrDefault(startBeat, 0),
    isDirty: (includes(dirtyChannels, id) ||
      some(childChannels, { isDirty: true }) ||
      some(childClips, { isDirty: true })),
    channels: sortBy(childChannels, ['startBeat', 'id']),
    clips: sortBy(childClips, ['startBeat', 'id'])
  }
}
