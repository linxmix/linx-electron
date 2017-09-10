const { get, find, filter, includes, some, every,
  map, concat, sortBy, omitBy, isNil, head, last } = require('lodash')
const d3 = require('d3')

const { isValidNumber, validNumberOrDefault, beatToTime } = require('../../lib/number-utils')
const { CHANNEL_TYPE_MIX, CHANNEL_TYPE_TRANSITION } = require('../constants')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_TEMPO } = require('../../clips/constants')

module.exports = nestChannels

function nestChannels ({ channelId, channels, clips, dirtyChannels = [] }) {
  const channel = channels[channelId] || {}
  const { id, type, startBeat, channelIds: childChannelIds = [], clipIds = [] } = channel

  // compute children
  const childChannels = childChannelIds.map(childChannelId => {
    return nestChannels({ channelId: childChannelId, channels, clips, dirtyChannels })
  })
  const childClips = clipIds.map(clipId => (clips[clipId] || {}))
  const childSampleClips = filter(childClips, { type: CLIP_TYPE_SAMPLE })

  // compute status
  let status = 'unloaded'
  if (some(childChannels, { status: 'loading' }) || some(childSampleClips, { status: 'loading' })) {
    status = 'loading'
  } else if (every(childChannels, { status: 'loaded' }) && every(childSampleClips, { status: 'loaded' })) {
    status = 'loaded'
  }

  // compute beatCount
  let beatCount
  if (type === CHANNEL_TYPE_TRANSITION) {
    beatCount = channel.beatCount
  } else {
    beatCount = validNumberOrDefault(Math.max.apply(Math, map(
      concat(childChannels, childClips),
      ({ startBeat, beatCount }) => startBeat + beatCount,
    )), 0)
  }

  // compute beatScale, bpmScale
  let beatScale, bpmScale
  if (type === CHANNEL_TYPE_MIX) {
    const tempoClip = find(childClips, { type: CLIP_TYPE_TEMPO }) || {}
    const controlPoints = get(tempoClip, 'controlPoints') || []

    if (controlPoints.length) {
      const controlPointValues = map(controlPoints, 'value')
      const controlPointBeats = map(controlPoints, 'beat')

      bpmScale = d3.scaleLinear()
        .domain([0].concat(controlPointBeats).concat(beatCount))
        .range([head(controlPointValues)]
          .concat(controlPointValues)
          .concat(last(controlPointValues)))

      beatScale = d3.scaleLinear()
        .domain(bpmScale.domain())
        .range(_calculateBeatScaleRange(bpmScale))

      // console.log('tempoClip', {
      //   tempoClip,
      //   "bpmScale.domain()": bpmScale.domain(),
      //   "bpmScale.range()": bpmScale.range(),
      //   "beatScale.domain()": beatScale.domain(),
      //   "beatScale.range()": beatScale.range(),
      // })

    } else {
      const bpm = 128
      bpmScale = d3.scaleLinear()
        .domain([0, beatCount])
        .range([bpm, bpm])

      beatScale = d3.scaleLinear()
        .domain([0, beatCount])
        .range([0, beatToTime(beatCount, bpm)])
    }
  }

  return omitBy({
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
  }, isNil)
}

function _calculateBeatScaleRange(bpmScale) {

  // add durations from each linear interval
  const domain = bpmScale.domain();
  return domain.reduce((range, endBeat, i) => {
    if (i === 0) { return [0] }

    const prevDuration = range[i - 1];

    const startBeat = domain[i - 1];
    const startBpm = bpmScale(startBeat);
    const endBpm = bpmScale(endBeat);

    const intervalBeatCount = endBeat - startBeat;
    const averageBpm = (endBpm + startBpm) / 2.0;
    const minutes = intervalBeatCount / averageBpm;
    const seconds = minutes * 60;

    // console.log('calculate seconds', {
    //   startBeat,
    //   endBeat,
    //   startBpm,
    //   endBpm,
    //   intervalBeatCount,
    //   averageBpm,
    //   minutes,
    //   seconds,
    //   prevDuration
    // });

    if (isValidNumber(seconds)) {
      return [...range, prevDuration + seconds]
    } else {
      return [...range, prevDuration]
    }
  }, []);
}
