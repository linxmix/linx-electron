const { get, find, filter, includes, some, every, assign,
  map, concat, sortBy, omitBy, isNil, head, last } = require('lodash')
const d3 = require('d3')

const { isValidNumber, validNumberOrDefault, beatToTime } = require('../../lib/number-utils')
const {
  CHANNEL_TYPE_MIX,
  CHANNEL_TYPE_TRACK_GROUP,
  CHANNEL_TYPE_PRIMARY_TRACK,
  CHANNEL_TYPE_SAMPLE_TRACK
} = require('../constants')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_TEMPO } = require('../../clips/constants')

module.exports = nestChannels

function nestChannels ({ channelId, parentChannel, channels, clips, samples, dirtyChannels = [] }) {
  const channel = channels[channelId] || {}
  const { id, type, startBeat, channelIds: childChannelIds = [], clipIds = [] } = channel
  const currentChannel = { id: channelId, parentChannel }

  // compute children
  const childChannels = childChannelIds.map(childChannelId => nestChannels({
    channelId: childChannelId,
    parentChannel: currentChannel,
    channels,
    clips,
    samples,
    dirtyChannels
  }))
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
  const _minBeats = concat(map(childChannels, 'minBeat'), map(childClips, 'startBeat'))
  const _maxBeats = concat(map(childChannels, 'maxBeat'),
    map(childClips, ({ startBeat, beatCount }) => startBeat + beatCount))
  const minBeat = channel.startBeat + Math.min(0, ..._minBeats)
  const maxBeat = channel.startBeat + Math.max(0, ..._maxBeats)
  const beatCount = validNumberOrDefault(maxBeat - minBeat, 0)

  // track channels properties
  const sampleId = channel.sampleId
  const sample = samples[sampleId] || {}
  const pitchSemitones = validNumberOrDefault(channel.pitchSemitones, 0)

  // track group channel properties
  const primaryTrack = find(childChannels, { type: CHANNEL_TYPE_PRIMARY_TRACK }) || {}
  const sampleTracks = filter(childChannels, { type: CHANNEL_TYPE_SAMPLE_TRACK }) || []

  // if (channel.type === CHANNEL_TYPE_TRACK_GROUP) {
  //   console.log('track group', {
  //     sampleId,
  //     primarySample,
  //     primaryTrack,
  //     sampleTracks
  //   })
  // }

  // mix channel properties
  let beatScale, bpmScale, tempoClip
  if (type === CHANNEL_TYPE_MIX) {
    tempoClip = find(childClips, { type: CLIP_TYPE_TEMPO }) || {}
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

      // console.log('mix tempoClip', {
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

  assign(currentChannel, omitBy({
    id,
    type,
    status,
    beatCount,
    beatScale,
    bpmScale,
    sample,
    sampleId,
    primaryTrack,
    sampleTracks,
    pitchSemitones,
    tempoClip,
    gain: validNumberOrDefault(channel.gain, 1),
    startBeat: validNumberOrDefault(startBeat, 0),
    minBeat: validNumberOrDefault(minBeat, 0),
    maxBeat: validNumberOrDefault(maxBeat, 0),
    isDirty: (includes(dirtyChannels, id) ||
      some(childChannels, { isDirty: true }) ||
      some(childClips, { isDirty: true })),
    channels: childChannels,
    clips: sortBy(childClips, ['startBeat', 'id'])
  }, isNil))

  return currentChannel
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

    if (isValidNumber(seconds)) {
      return [...range, prevDuration + seconds]
    } else {
      return [...range, prevDuration]
    }
  }, []);
}
