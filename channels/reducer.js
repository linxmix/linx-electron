const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { map, defaults, without, includes, merge } = require('lodash')
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
  createPrimaryTrackFromFile
} = require('./actions')
const { unsetClips, createClip } = require('../clips/actions')
const {
  createSample
} = require('../samples/actions')
const {
  CHANNEL_TYPE_MIX,
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
      dirty: without(state.dirty, action.payload.id),
    }),
    [createPrimaryTrackFromFile]: (state, action) => {
      const { file, parentChannelId } = action.payload

      const effectCreator = (sampleId) => {
        const channelId = uuid()
        const clipId = uuid()

        return Effects.batch([
          Effects.constant(createClip({ id: clipId, sampleId })),
          Effects.constant(createChannel({
            id: channelId,
            type: CHANNEL_TYPE_PRIMARY_TRACK,
            clipIds: [clipId] // TODO: maybe setClipChannel in future?
          })),
          Effects.constant(setChannelParent({ parentChannelId, channelId }))
        ])
      }

      return loop(state, Effects.constant(createSample({ file, effectCreator })))
    },
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
    }
  }, {
    dirty: [],
    records: {}
  })
}





















