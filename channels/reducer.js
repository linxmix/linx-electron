const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { map, defaults, without, includes,
  clone, filter, values, omit, assign } = require('lodash')
const uuid = require('uuid/v4')
const assert = require('assert')

const {
  setChannels,
  setChannel,
  unsetChannels,
  unsetChannel,
  undirtyChannels,
  undirtyChannel,
  createChannel,
  updateChannel,
  moveChannel,
  resizeChannel,
  setChannelParent,
  createPrimaryTrackFromFile,
  swapPrimaryTracks
} = require('./actions')
const { unsetClips, createClip } = require('../clips/actions')
const {
  createSample
} = require('../samples/actions')
const {
  CHANNEL_TYPE_PRIMARY_TRACK,
  CHANNEL_TYPES
} = require('./constants')
const { CLIP_TYPE_SAMPLE } = require('../clips/constants')
const { quantizeBeat } = require('../lib/number-utils')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [setChannels]: (state, action) => loop(state, Effects.batch(
      map(action.payload, channel => Effects.constant(setChannel(channel))))),
    [setChannel]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, action.payload.id),
      records: {
        ...state.records,
        [action.payload.id]: action.payload
      }
    }),
    [unsetChannels]: (state, action) => loop(state, Effects.batch(
      map(action.payload, id => Effects.constant(unsetChannel(id))))),
    [unsetChannel]: (state, action) => {
      const channel = state.records[action.payload]
      const { id, channelIds = [], clipIds = [] } = channel

      // remove this channel from all parent channels
      const parentChannels = filter(values(state.records), channel =>
        includes(channel.channelIds, id))
      const parentChannelEffects = map(parentChannels, channel =>
        Effects.constant(updateChannel({
          id: channel.id,
          channelIds: without(channel.channelIds, id)
        })))

      return loop({
        ...state,
        dirty: without(state.dirty, id),
        records: omit(state.records, id)
      }, Effects.batch(parentChannelEffects.concat([
        Effects.constant(unsetChannels(channelIds)),
        Effects.constant(unsetClips(clipIds))
      ])))
    },
    [undirtyChannels]: (state, action) => loop(state, Effects.batch(
      map(action.payload, id => Effects.constant(undirtyChannel(id))))),
    [undirtyChannel]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, action.payload)
    }),
    [createChannel]: (state, action) => {
      const attrs = defaults({}, action.payload, {
        id: uuid(),
        clipIds: [],
        channelIds: []
      })
      assert(includes(CHANNEL_TYPES, attrs.type), 'Must have valid type to createChannel')

      return loop({
        ...state, dirty: [...state.dirty, attrs.id]
      }, Effects.constant(setChannel(attrs)))
    },
    [setChannelParent]: (state, action) => {
      const { channelId, parentChannelId } = action.payload
      assert(channelId && parentChannelId, 'Must have both channelId and parentChannelId to setChannelParent')

      const parentChannel = state.records[parentChannelId]
      return loop(state, Effects.constant(updateChannel({
        id: parentChannelId,
        channelIds: [...parentChannel.channelIds, channelId]
      })))
    },
    [updateChannel]: (state, action) => {
      const { id } = action.payload
      assert(id, 'Cannot updateChannel without id')

      return {
        ...state,
        dirty: [...state.dirty, id],
        records: {
          ...state.records,
          [id]: assign({}, state.records[id], action.payload)
        }
      }
    },
    [createPrimaryTrackFromFile]: (state, action) => {
      const { file, parentChannelId, attrs = {} } = action.payload

      const effectCreator = (sampleId) => {
        const channelId = uuid()
        const clipId = uuid()

        return Effects.batch([
          Effects.constant(createClip({ id: clipId, sampleId, type: CLIP_TYPE_SAMPLE })),
          Effects.constant(createChannel(assign({
            id: channelId,
            type: CHANNEL_TYPE_PRIMARY_TRACK,
            clipIds: [clipId] // TODO(FUTURE): maybe setClipChannel?
          }, attrs))),
          Effects.constant(setChannelParent({ parentChannelId, channelId }))
        ])
      }

      return loop(state, Effects.constant(createSample({ file, effectCreator })))
    },
    [swapPrimaryTracks]: (state, action) => {
      const { sourceId, targetId } = action.payload
      if (sourceId === targetId) { return state }

      // TODO(FUTURE): also update both associated transitions to same endBeat as track
      // TODO(FUTURE): anything we need to do with track or transition length?
      const source = clone(state.records[sourceId])
      const target = clone(state.records[targetId])

      return {
        ...state,
        dirty: [...state.dirty, sourceId, targetId],
        records: {
          ...state.records,
          [sourceId]: assign({}, state.records[sourceId], {
            startBeat: target.startBeat
          }),
          [targetId]: assign({}, state.records[targetId], {
            startBeat: source.startBeat
          })
        }
      }
    },
    [moveChannel]: (state, action) => {
      const { id, startBeat, diffBeats, quantization } = action.payload

      return loop(state, Effects.constant(updateChannel({
        id,
        startBeat: quantizeBeat({ quantization, beat: diffBeats }) + startBeat
      })))
    },
    [resizeChannel]: (state, action) => {
      const { id, startBeat, beatCount, diffBeats, isResizeLeft, quantization } = action.payload
      const quantizedDiffBeats = quantizeBeat({ quantization, beat: diffBeats })

      let updatePayload
      if (isResizeLeft) {
        updatePayload = {
          id,
          startBeat: startBeat + quantizedDiffBeats,
          beatCount: beatCount - quantizedDiffBeats
        }
      } else {
        updatePayload = {
          id,
          beatCount: beatCount + quantizedDiffBeats
        }
      }

      return loop(state, Effects.constant(updateChannel(updatePayload)))
    }
  }, {
    dirty: [],
    records: {}
  })
}

