const { Cmd, loop } = require('redux-loop')
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
    [unsetChannels]: (state, action) => loop(state, Cmd.batch(
      map(action.payload, id => Cmd.action(unsetChannel(id))))),
    [unsetChannel]: (state, action) => {
      const channel = state.records[action.payload]
      const { id, channelIds = [], clipIds = [] } = channel

      // remove this channel from all parent channels
      const parentChannels = filter(values(state.records), channel =>
        includes(channel.channelIds, id))
      const parentChannelEffects = map(parentChannels, channel =>
        Cmd.action(updateChannel({
          id: channel.id,
          channelIds: without(channel.channelIds, id)
        })))

      return loop({
        ...state,
        dirty: without(state.dirty, id),
        records: omit(state.records, id)
      }, Cmd.batch(parentChannelEffects.concat([
        Cmd.action(unsetChannels(channelIds)),
        Cmd.action(unsetClips(clipIds))
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

      return loop(state, Cmd.action(updateChannels([{
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

      return loop(state, Cmd.action(updateChannel({
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
      return loop(state, Cmd.batch([
        Cmd.action(updateChannel({
          id: channelId,
          clipIds: without(channel.clipIds || [], ...clipIds)
        })),
        Cmd.action(unsetClips(clipIds))
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

      return loop(state, Cmd.action(updateChannel({
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

        return Cmd.batch([
          Cmd.action(createClip({ id: clipId, sampleId, type: CLIP_TYPE_SAMPLE })),
          Cmd.action(createChannel({
            id: primaryTrackId,
            type: CHANNEL_TYPE_PRIMARY_TRACK,
            sampleId
          })),
          Cmd.action(setClipsChannel({
            channelId: primaryTrackId,
            clipIds: [clipId]
          })),
          Cmd.action(createChannel(assign({
            id: trackGroupId,
            type: CHANNEL_TYPE_TRACK_GROUP
          }, attrs))),
          Cmd.action(setChannelsParent({
            parentChannelId: trackGroupId,
            channelIds: [primaryTrackId] })),
          Cmd.action(setChannelsParent({
            parentChannelId,
            channelIds: [trackGroupId]
          }))
        ])
      }

      return loop(state, Cmd.action(createSample({ file, effectCreator })))
    },
    [createSampleTrackFromFile]: (state, action) => {
      const { file, parentChannelId, clipAttrs = {}, channelAttrs = {} } = action.payload

      const effectCreator = (sampleId) => {
        const clipId = uuid()
        const sampleTrackId = uuid()

        return Cmd.batch([
          Cmd.action(createClip(assign({}, clipAttrs, {
            sampleId,
            id: clipId,
            type: CLIP_TYPE_SAMPLE
          }))),
          Cmd.action(createChannel(assign({}, channelAttrs, {
            id: sampleTrackId,
            type: CHANNEL_TYPE_SAMPLE_TRACK,
            sampleId
          }))),
          Cmd.action(setClipsChannel({
            channelId: sampleTrackId,
            clipIds: [clipId]
          })),
          Cmd.action(setChannelsParent({
            parentChannelId,
            channelIds: [sampleTrackId]
          }))
        ])
      }

      return loop(state, Cmd.action(createSample({ file, effectCreator })))
    },
    [snipClipAndSplitTrackGroup]: (state, action) => {
      const { mix, channel: primaryTrack, clip, splitAtBeat, quantization } = action.payload

      // first: split the primary track clip that originated this action
      return loop(state, Cmd.batch([
        Cmd.action(snipClip({
          quantization,
          clip,
          channel: primaryTrack,
          snipAtBeat: splitAtBeat
        })),
        Cmd.action(splitTrackGroup({
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
              Cmd.action(deleteControlPoint({
                sourceId: automationClip.id,
                id: controlPoint.id
              })),
              Cmd.action(createControlPoint({
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
          Cmd.action(createClip({
            id: newClipId,
            type: CLIP_TYPE_AUTOMATION,
            controlType: automationClip.controlType
          })),
          Cmd.action(setClipsChannel({
            channelId: newPrimaryTrackId,
            clipIds: [newClipId]
          })),
          ...controlPointEffects
        ]
      }))
        
      return loop(state, Cmd.batch([

        // make new track group (left side)
        Cmd.action(createChannel({
          id: newTrackGroupId,
          type: CHANNEL_TYPE_TRACK_GROUP,
          startBeat: trackGroup.startBeat,
          sampleId: primaryTrack.sampleId
        })),
        Cmd.action(insertChannelAtIndex({
          channelId: newTrackGroupId,
          parentChannelId: mixChannel.id,
          index: trackGroup.index
        })),

        // move existing primary track into new track group
        Cmd.action(setChannelsParent({
          parentChannelId: newTrackGroupId,
          channelIds: [primaryTrack.id],
          prevParentChannelIds: [trackGroup.id]
        })),

        // update existing track group startBeat
        Cmd.action(updateChannel({
          id: trackGroup.id,
          startBeat: trackGroup.startBeat + quantizedSplitAtBeat
        })),

        // update existing channels startBeat
        Cmd.action(updateChannels(map(reject(
          trackGroup.channels,
          { type: CHANNEL_TYPE_PRIMARY_TRACK }),
          channel => ({
            ...channel,
            startBeat: channel.startBeat - quantizedSplitAtBeat
          })
        ))),

        // create new primary track in existing track group
        Cmd.action(createChannel({
          id: newPrimaryTrackId,
          type: CHANNEL_TYPE_PRIMARY_TRACK,
          startBeat: 0,
          sampleId: primaryTrack.sampleId
        })),
        Cmd.action(setChannelsParent({
          parentChannelId: trackGroup.id,
          channelIds: [newPrimaryTrackId]
        })),

        // move sample clips starting right of split into new primary track
        // TODO: combine these two into the same action
        !sampleClipsToMove.length ? Cmd.none() : Cmd.action(setClipsParent({
          channelId: newPrimaryTrackId,
          clipIds: [map(sampleClipsToMove, 'id')]
        })),
        !sampleClipsToMove.length ? Cmd.none() : Cmd.action(removeClipsFromChannel({
          channelId: primaryTrack.id,
          clipIds: [map(sampleClipsToMove, 'id')]
        })),
      ].concat(automationClipEffects).concat([

        // navigate to newly created 'transition'
        Cmd.action(
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
        map(channelsToMove, channel => Cmd.action(updateChannel({
          id: channel.id,
          startBeat: channel.startBeat + beatsToMove
        }))),
        !tempoControlPoints ? Cmd.none() : Cmd.action(updateClip({
          id: mixTempoClip.id,
          controlPoints: keyBy(map(tempoControlPoints, controlPoint => ({
            ...controlPoint,
            beat: controlPoint.beat >= (moveTempoControlsFromBeat + diffBeats) ?
              controlPoint.beat + beatsToMove :
              controlPoint.beat
          })), 'id')
        }))
      )

      return loop(state, Cmd.batch([
        Cmd.action(updateChannel({
          id,
          startBeat: startBeat + beatsToMove
        }))
      ].concat(nextEffects)))
    },
    [moveChannel]: (state, action) => {
      const { id, startBeat, diffBeats, quantization } = action.payload

      return loop(state, Cmd.action(updateChannel({
        id,
        startBeat: quantizeBeat({ quantization, beat: diffBeats }) + startBeat
      })))
    },
  }, {
    dirty: [],
    records: {}
  })
}

