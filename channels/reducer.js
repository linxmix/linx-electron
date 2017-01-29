const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { map, defaults, without, includes, merge, clone } = require('lodash')
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
} = require('../channels/constants')

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
      map(action.payload, channel => Effects.constant(unsetChannel(channel))))),
    [unsetChannel]: (state, action) => {
      const channel = action.payload
      const { id, channels, clips } = channel

      const nextRecords = state.records
      delete nextRecords[id]

      return loop({
        ...state,
        dirty: without(state.dirty, id),
        records: nextRecords
      }, Effects.batch([
        Effects.constant(unsetChannels(channels)),
        Effects.constant(unsetClips(clips))
      ]))
    },
    [undirtyChannels]: (state, action) => loop(state, Effects.batch(
      map(action.payload, channel => Effects.constant(undirtyChannel(channel))))),
    [undirtyChannel]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, action.payload.id)
    }),
    [createChannel]: (state, action) => {
      const attrs = defaults(action.payload, {
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
          [id]: merge(state.records[id], action.payload)
        }
      }
    },
    [createPrimaryTrackFromFile]: (state, action) => {
      const { file, parentChannelId, attrs = {} } = action.payload

      const effectCreator = (sampleId) => {
        const channelId = uuid()
        const clipId = uuid()

        return Effects.batch([
          Effects.constant(createClip({ id: clipId, sampleId })),
          Effects.constant(createChannel(merge({
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
          [sourceId]: merge(state.records[sourceId], {
            startBeat: target.startBeat
          }),
          [targetId]: merge(state.records[targetId], {
            startBeat: source.startBeat
          })
        }
      }
    }
  }, {
    dirty: [],
    records: {}
  })
}

