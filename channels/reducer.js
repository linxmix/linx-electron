const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { push } = require('react-router-redux')
const { assign, get, flatten, keyBy, map, defaults, without, includes, findIndex, concat,
  filter, values, omit, indexOf, reduce, reject, uniq } = require('lodash')
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
  updateChannels,
  moveTrackGroup,
  moveChannel,
  splitTrackGroup,
  snipClipAndSplitTrackGroup,
  insertChannelAtIndex,
  setClipsChannel,
  removeClipsFromChannel,
  setChannelsParent,
  createTrackGroupFromFile,
  createSampleTrackFromFile,
  swapChannels
} = require('./actions')
const {
  unsetClips, createClip, updateClip, snipClip, createControlPoint, deleteControlPoint
} = require('../clips/actions')
const {
  createSample
} = require('../samples/actions')
const {
  CHANNEL_TYPE_PRIMARY_TRACK,
  CHANNEL_TYPE_SAMPLE_TRACK,
  CHANNEL_TYPE_TRACK_GROUP,
  CHANNEL_TYPES
} = require('./constants')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_AUTOMATION } = require('../clips/constants')
const { quantizeBeat } = require('../lib/number-utils')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [setChannels]: (state, action) => {
      const records = reduce(action.payload, (records, channel) => {
        records[channel.id] = channel
        return records
      }, { ...state.records })

      return {
        ...state,
        records,
        dirty: without(state.dirty, ...map(action.payload, 'id')),
      }
    },
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
    [undirtyChannels]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, ...action.payload)
    }),
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

      return {
        ...state,
        dirty: [...state.dirty, attrs.id],
        records: {
          ...state.records,
          [attrs.id]: attrs
        }
      }
    },
    [setChannelsParent]: (state, action) => {
      const { channelIds, parentChannelId, prevParentChannelIds } = action.payload
      assert(channelIds && channelIds.length && parentChannelId,
        'Must have channelIds and parentChannelId to setChannelsParent')

      const parentChannel = state.records[parentChannelId] || {}
      const prevParentChannelsToUpdate = map(prevParentChannelIds || [], channelId => ({
        id: channelId,
        channelIds: without(get(state, `records[${channelId}].channelIds`), ...channelIds)
      }))

      return loop(state, Effects.constant(updateChannels([{
        id: parentChannelId,
        channelIds: concat((parentChannel.channelIds || []), channelIds)
      }].concat(prevParentChannelsToUpdate))))
    },
    [insertChannelAtIndex]: (state, action) => {
      const { parentChannelId, channelId, index } = action.payload

      const parentChannel = state.records[parentChannelId] || {}
      let newChannelIds = (parentChannel.channelIds || []).slice()
      newChannelIds.splice(index, 0, channelId);
      newChannelIds = uniq(newChannelIds)

      return loop(state, Effects.constant(updateChannel({
        id: parentChannelId,
        channelIds: newChannelIds
      })))
    },
    [setClipsChannel]: (state, action) => {
      const { channelId, clipIds } = action.payload
      assert(channelId && clipIds, 'Must have channelId and clipIds to setClipsChannel')

      const channel = state.records[channelId] || {}
      return {
        ...state,
        dirty: [...state.dirty, channelId],
        records: {
          ...state.records,
          [channelId]: assign({}, channel, {
            id: channelId,
            clipIds: concat((channel.clipIds || []), clipIds)
          })
        }
      }
    },
    [removeClipsFromChannel]: (state, action) => {
      const { channelId, clipIds } = action.payload
      assert(channelId && clipIds, 'Must have channelId and clipIds to removeClipsFromChannel')

      const channel = state.records[channelId] || {}
      return loop(state, Effects.batch([
        Effects.constant(updateChannel({
          id: channelId,
          clipIds: without(channel.clipIds || [], ...clipIds)
        })),
        Effects.constant(unsetClips(clipIds))
      ]))
    },
    [updateChannel]: (state, action) => {
      const { id } = action.payload

      return {
        ...state,
        dirty: [...state.dirty, id],
        records: {
          ...state.records,
          [id]: assign({}, state.records[id], action.payload)
        }
      }
    },
    [updateChannels]: (state, action) => {
      const channels = action.payload
      const channelIds = map(channels, 'id')

      const updatedChannels = map(channels,
        channel => assign({}, state.records[channel.id], channel))

      return {
        ...state,
        dirty: [...state.dirty, ...channelIds],
        records: {
          ...state.records,
          ...keyBy(updatedChannels, 'id')
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
    [swapChannels]: (state, action) => {
      const { sourceId, targetId, parentId } = action.payload
      if (sourceId === targetId) { return state }

      const source = state.records[sourceId]
      const target = state.records[targetId]
      const parent = state.records[parentId]
      const parentChannelIds = parent.channelIds.slice()
      const sourceIndex = indexOf(parentChannelIds, sourceId)
      const targetIndex = indexOf(parentChannelIds, targetId)

      parentChannelIds[targetIndex] = sourceId
      parentChannelIds[sourceIndex] = targetId

      return {
        ...state,
        dirty: [...state.dirty, sourceId, targetId, parentId],
        records: {
          ...state.records,
          [parentId]: assign({}, parent, {
            channelIds: parentChannelIds
          }),
          // TODO: should reordering tracks in primary track table cause anything in the arrangement to move?
          // [sourceId]: assign({}, source, {
          //   startBeat: target.startBeat
          // }),
          // [targetId]: assign({}, target, {
          //   startBeat: source.startBeat
          // })
        }
      }
    },
    [createTrackGroupFromFile]: (state, action) => {
      const { file, parentChannelId, attrs = {} } = action.payload

      const effectCreator = (sampleId) => {
        const clipId = uuid()
        const primaryTrackId = uuid()
        const trackGroupId = uuid()

        return Effects.batch([
          Effects.constant(createClip({ id: clipId, sampleId, type: CLIP_TYPE_SAMPLE })),
          Effects.constant(createChannel({
            id: primaryTrackId,
            type: CHANNEL_TYPE_PRIMARY_TRACK,
            sampleId
          })),
          Effects.constant(setClipsChannel({
            channelId: primaryTrackId,
            clipIds: [clipId]
          })),
          Effects.constant(createChannel(assign({
            id: trackGroupId,
            type: CHANNEL_TYPE_TRACK_GROUP
          }, attrs))),
          Effects.constant(setChannelsParent({
            parentChannelId: trackGroupId,
            channelIds: [primaryTrackId] })),
          Effects.constant(setChannelsParent({
            parentChannelId,
            channelIds: [trackGroupId]
          }))
        ])
      }

      return loop(state, Effects.constant(createSample({ file, effectCreator })))
    },
    [createSampleTrackFromFile]: (state, action) => {
      const { file, parentChannelId, clipAttrs = {}, channelAttrs = {} } = action.payload

      const effectCreator = (sampleId) => {
        const clipId = uuid()
        const sampleTrackId = uuid()

        return Effects.batch([
          Effects.constant(createClip(assign({}, clipAttrs, {
            sampleId,
            id: clipId,
            type: CLIP_TYPE_SAMPLE
          }))),
          Effects.constant(createChannel(assign({}, channelAttrs, {
            id: sampleTrackId,
            type: CHANNEL_TYPE_SAMPLE_TRACK,
            sampleId
          }))),
          Effects.constant(setClipsChannel({
            channelId: sampleTrackId,
            clipIds: [clipId]
          })),
          Effects.constant(setChannelsParent({
            parentChannelId,
            channelIds: [sampleTrackId]
          }))
        ])
      }

      return loop(state, Effects.constant(createSample({ file, effectCreator })))
    },
    [snipClipAndSplitTrackGroup]: (state, action) => {
      const { mix, channel: primaryTrack, clip, splitAtBeat, quantization } = action.payload

      // first: split the primary track clip that originated this action
      return loop(state, Effects.batch([
        Effects.constant(snipClip({
          quantization,
          clip,
          channel: primaryTrack,
          snipAtBeat: splitAtBeat
        })),
        Effects.constant(splitTrackGroup({
          mix,
          primaryTrack,
          splitAtBeat,
          quantization
        }))
      ]))
    },
    [splitTrackGroup]: (state, action) => {
      const { mix, primaryTrack, splitAtBeat, quantization } = action.payload

      // steps are as follows:
        // make new track group (left side)
        // move existing primary track into new track group
        // update existing track group startBeat
        // update existing channels startBeat
        // create new primary track in existing track group
        // split existing sample clips
          // clips starting left of split: untouched
          // clips starting right of split: move into new primary track
        // split existing automation clips:
          // create a new automation clip of that type in new primary track
          // control points left of split: untouched
          // control points right of split: move into new primary track
        // navigate to newly created 'transition'

      const trackGroup = primaryTrack.parentChannel
      const mixChannel = trackGroup.parentChannel
      const quantizedSplitAtBeat = quantizeBeat({
        quantization,
        beat: splitAtBeat,
        offset: mixChannel.startBeat + trackGroup.startBeat
      })

      const newTrackGroupId = uuid()
      const newPrimaryTrackId = uuid()

      // split existing sample clips
        // clips starting left of split: untouched
        // clips starting right of split: move into new primary track
      const sampleClipsToMove = filter(filter(primaryTrack.clips, { type: CLIP_TYPE_SAMPLE }), sampleClip => {
          const sampleClipBeatInTrackGroup = primaryTrack.startBeat + sampleClip.startBeat
          return sampleClipBeatInTrackGroup >= quantizedSplitAtBeat
        });

      // split existing automation clips:
        // create a new automation clip of that type in new primary track
        // control points left of split: untouched
        // control points right of split: move into new primary track
      const automationClipEffects = flatten(map(filter(primaryTrack.clips, { type: CLIP_TYPE_AUTOMATION }), automationClip => {
        const newClipId = uuid()

        const controlPointEffects = reduce(automationClip.controlPoints, (controlPointEffects, controlPoint) => {
          const controlPointBeatInTrackGroup =
            primaryTrack.startBeat + automationClip.startBeat + controlPoint.beat

          if (controlPointBeatInTrackGroup >= quantizedSplitAtBeat) {
            return controlPointEffects.concat([
              Effects.constant(deleteControlPoint({
                sourceId: automationClip.id,
                id: controlPoint.id
              })),
              Effects.constant(createControlPoint({
                sourceId: newClipId,
                beat: controlPoint.beat,
                value: controlPoint.value
              }))
            ])
          } else {
            return controlPointEffects
          }
        }, [])

        return [
          Effects.constant(createClip({
            id: newClipId,
            type: CLIP_TYPE_AUTOMATION,
            controlType: automationClip.controlType
          })),
          Effects.constant(setClipsChannel({
            channelId: newPrimaryTrackId,
            clipIds: [newClipId]
          })),
          ...controlPointEffects
        ]
      }))
        
      return loop(state, Effects.batch([

        // make new track group (left side)
        Effects.constant(createChannel({
          id: newTrackGroupId,
          type: CHANNEL_TYPE_TRACK_GROUP,
          startBeat: trackGroup.startBeat,
          sampleId: primaryTrack.sampleId
        })),
        Effects.constant(insertChannelAtIndex({
          channelId: newTrackGroupId,
          parentChannelId: mixChannel.id,
          index: trackGroup.index
        })),

        // move existing primary track into new track group
        Effects.constant(setChannelsParent({
          parentChannelId: newTrackGroupId,
          channelIds: [primaryTrack.id],
          prevParentChannelIds: [trackGroup.id]
        })),

        // update existing track group startBeat
        Effects.constant(updateChannel({
          id: trackGroup.id,
          startBeat: trackGroup.startBeat + quantizedSplitAtBeat
        })),

        // update existing channels startBeat
        Effects.constant(updateChannels(map(reject(
          trackGroup.channels,
          { type: CHANNEL_TYPE_PRIMARY_TRACK }),
          channel => ({
            ...channel,
            startBeat: channel.startBeat - quantizedSplitAtBeat
          })
        ))),

        // create new primary track in existing track group
        Effects.constant(createChannel({
          id: newPrimaryTrackId,
          type: CHANNEL_TYPE_PRIMARY_TRACK,
          startBeat: 0,
          sampleId: primaryTrack.sampleId
        })),
        Effects.constant(setChannelsParent({
          parentChannelId: trackGroup.id,
          channelIds: [newPrimaryTrackId]
        })),

        // move sample clips starting right of split into new primary track
        // TODO: combine these two into the same action
        !sampleClipsToMove.length ? Effects.none() : Effects.constant(setClipsParent({
          channelId: newPrimaryTrackId,
          clipIds: [map(sampleClipsToMove, 'id')]
        })),
        !sampleClipsToMove.length ? Effects.none() : Effects.constant(removeClipsFromChannel({
          channelId: primaryTrack.id,
          clipIds: [map(sampleClipsToMove, 'id')]
        })),
      ].concat(automationClipEffects).concat([

        // navigate to newly created 'transition'
        Effects.constant(
          push(`/mixes/${mix.id}/trackGroups/${newTrackGroupId}/${trackGroup.id}`
        ))
      ])))
    },
    [moveTrackGroup]: (state, action) => {
      const { trackGroup, diffBeats, quantization, moveTempoControlsFromBeat } = action.payload
      const beatsToMove = quantizeBeat({ quantization, beat: diffBeats })
      if (beatsToMove === 0) { return state }

      const { id, startBeat, index: trackGroupIndex } = trackGroup
      const { channels: mixChannels, tempoClip: mixTempoClip } = trackGroup.parentChannel

      // move following track groups and tempo control points
      const channelsToMove = filter(mixChannels, ({ index }) => index > trackGroupIndex)
      const tempoControlPoints = mixTempoClip && mixTempoClip.controlPoints

      const nextEffects = concat(
        map(channelsToMove, channel => Effects.constant(updateChannel({
          id: channel.id,
          startBeat: channel.startBeat + beatsToMove
        }))),
        !tempoControlPoints ? Effects.none() : Effects.constant(updateClip({
          id: mixTempoClip.id,
          controlPoints: keyBy(map(tempoControlPoints, controlPoint => ({
            ...controlPoint,
            beat: controlPoint.beat >= (moveTempoControlsFromBeat + diffBeats) ?
              controlPoint.beat + beatsToMove :
              controlPoint.beat
          })), 'id')
        }))
      )

      return loop(state, Effects.batch([
        Effects.constant(updateChannel({
          id,
          startBeat: startBeat + beatsToMove
        }))
      ].concat(nextEffects)))
    },
    [moveChannel]: (state, action) => {
      const { id, startBeat, diffBeats, quantization } = action.payload

      return loop(state, Effects.constant(updateChannel({
        id,
        startBeat: quantizeBeat({ quantization, beat: diffBeats }) + startBeat
      })))
    },
  }, {
    dirty: [],
    records: {}
  })
}

