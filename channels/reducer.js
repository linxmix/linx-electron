const { Cmd, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { push } = require('react-router-redux')
const { assign, get, flatten, keyBy, map, defaults, without, includes, findIndex, concat,
  filter, values, omit, indexOf, mapValues, reduce, reject, uniq } = require('lodash')
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
  duplicateTrackChannel,
  duplicateTrackGroup,
  insertChannelAtIndex,
  setClipsChannel,
  removeClipsFromChannel,
  setChannelsParent,
  createTrackGroup,
  createTrackGroupFromFile,
  createSampleTrackFromFile,
  createMixFromJson,
  swapChannels
} = require('./actions')
const {
  unsetClips, createClip, updateClip, snipClip, createControlPoint, deleteControlPoint, createAutomationClipWithControlPoint
} = require('../clips/actions')
const {
  createSample,
  readJsonAndCreateSamples
} = require('../samples/actions')
const {
  CHANNEL_TYPE_PRIMARY_TRACK,
  CHANNEL_TYPE_SAMPLE_TRACK,
  CHANNEL_TYPE_TRACK_GROUP,
  CHANNEL_TYPES
} = require('./constants')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_AUTOMATION, CONTROL_TYPE_VOLUME } = require('../clips/constants')
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
    [createTrackGroup]: (state, action) => {
      const { sampleId, parentChannelId, primaryClipAttrs = {}, trackGroupAttrs = {}, primaryChannelAttrs = {} } = action.payload

      const primaryTrackId = action.payload.primaryTrackId || uuid()
      const clipId = uuid()
      const trackGroupId = uuid()

      return loop(state, Cmd.batch([
        Cmd.action(createClip(assign({
          id: clipId,
          sampleId,
          type: CLIP_TYPE_SAMPLE
        }, primaryClipAttrs))),
        Cmd.action(createChannel(assign({
          id: primaryTrackId,
          type: CHANNEL_TYPE_PRIMARY_TRACK,
          sampleId
        }, primaryChannelAttrs))),
        Cmd.action(setClipsChannel({
          channelId: primaryTrackId,
          clipIds: [clipId]
        })),
        Cmd.action(createChannel(assign({
          id: trackGroupId,
          type: CHANNEL_TYPE_TRACK_GROUP
        }, trackGroupAttrs))),
        Cmd.action(setChannelsParent({
          parentChannelId: trackGroupId,
          channelIds: [primaryTrackId] })),
        Cmd.action(setChannelsParent({
          parentChannelId,
          channelIds: [trackGroupId]
        }))
      ]))
    },
    [createTrackGroupFromFile]: (state, action) => {
      const { file, parentChannelId, trackGroupAttrs = {} } = action.payload

      const effectCreator = (sampleId) => {
        return Cmd.action(createTrackGroup({
          sampleId,
          parentChannelId,
          trackGroupAttrs
        }))
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
    [createMixFromJson]: (state, action) => {
      const { file, parentChannelId } = action.payload

      const effectCreator = ({ sampleIds, transitionInfo }) => {
        console.log('EFFECT CREATOR', { sampleIds, transitionInfo })
        const [ transition, prediction ] = transitionInfo
        const trackAID = uuid()
        const trackGroupAID = uuid()
        const trackBID = uuid()
        const trackGroupBID = uuid()
        const mixBpm = 130 // inferred from the werthen dataset

        const trackA = transition.trackA
        const trackAStartBeat = trackA.time * mixBpm / 60
        const createTrackAEffect = _createTrackGroup({
          trackGroupId: trackGroupAID,
          primaryTrackId: trackAID,
          parentChannelId,
          sampleId: sampleIds[0],
          primaryClipAttrs: {
            audioStartTime: trackA.offset
          },
          trackGroupAttrs: {
            startBeat: trackAStartBeat
          }
        })
        const trackB = transition.trackB
        const trackBStartBeat = trackB.time * mixBpm / 60
        const createTrackBEffect = _createTrackGroup({
          trackGroupId: trackGroupBID,
          primaryTrackId: trackBID,
          parentChannelId,
          sampleId: sampleIds[1],
          primaryClipAttrs: {
            audioStartTime: trackB.offset
          },
          trackGroupAttrs: {
            startBeat: trackBStartBeat
          }
        })

        // convert prediction xfades to automation clips
        const sampleRate = 22050 // same as autodj
        const hopLength = 512 // same as autodj

        const transitionStartBeat = transition.start * mixBpm / 60
        const transitionEndBeat = transition.end * mixBpm / 60
        const transitionBeatCount = transitionEndBeat - transitionStartBeat
        const controlPointArgs = prediction.map((yi, i) => ({

          // do not include transitionStartBeat because we are offset
          // by trackGroup.startBeat
          beat: (i / prediction.length) * transitionBeatCount,
          value: yi[0],
        }))

        // TODO: need to add track end location?
        // TODO: why are tracks not lining up?
        console.log('createMixFromJson BLOOPER', {
          transitionStartBeat,
          trackAStartBeat,
          trackBStartBeat,
        })

        const volumeEffect = createAutomationClipWithControlPoint({
          channelId: trackBID,
          controlType: CONTROL_TYPE_VOLUME,
          quantization: 'sample',
          controlPointArgs,
        })

        return Cmd.batch([
          createTrackAEffect,
          createTrackBEffect,
          Cmd.action(setChannelsParent({
            parentChannelId,
            channelIds: [trackGroupAID, trackGroupBID]
          })),
          Cmd.action(volumeEffect)
        ])
      }

      return loop(state,
        Cmd.action(readJsonAndCreateSamples({ file, effectCreator })))
    },
    [duplicateTrackGroup]: (state, action) => {
      const { channel, targetParentId } = action.payload
      const newChannelId = uuid()

      const trackChannelActions = map(channel.channels || [],
        channel => Cmd.action(duplicateTrackChannel({
          channel,
          targetParentId: newChannelId
        })))

      return loop(state, Cmd.list([
        Cmd.action(createChannel({
          id: newChannelId,
          type: channel.type,
          startBeat: channel.startBeat
        })),
        Cmd.action(setChannelsParent({
          parentChannelId: targetParentId,
          channelIds: [newChannelId]
        }))
      ].concat(trackChannelActions), { sequence: true }))
    },
    [duplicateTrackChannel]: (state, action) => {
      const { channel, targetParentId } = action.payload
      const newChannelId = uuid()

      const setChannelParentAction = targetParentId
        ? Cmd.action(setChannelsParent({
          parentChannelId: targetParentId,
          channelIds: [newChannelId]
        }))
        : Cmd.action(insertChannelAtIndex({
          channelId: newChannelId,
          parentChannelId: channel.parentChannel.id,
          index: indexOf(channel.parentChannel.channels, channel) + 1
        }))

      const newClipIds = []
      const clipCommands = map(channel.clips || [], (clip) => {
        const newClipId = uuid()
        newClipIds.push(newClipId)

        if (clip.isSampleClip) {
          return Cmd.action(createClip({
            id: newClipId,
            sampleId: clip.sampleId,
            type: clip.type,
            startBeat: clip.startBeat,
            audioStartTime: clip.audioStartTime,
            beatCount: clip.beatCount
          }))
        } else if (clip.isAutomationClip) {
          const controlPoints = clip.controlPoints || []

          return Cmd.action(createClip({
            id: newClipId,
            type: clip.type,
            controlType: clip.controlType,
            controlPoints: keyBy(
              mapValues(controlPoints, ({ beat, value }) => ({
                id: uuid(),
                beat,
                value
              })),
              'id'
            )
          }))
        } else {
          throw new Error('Clip of unknown type')
        }
      })

      return loop(state, Cmd.list([
        Cmd.action(createChannel({
          id: newChannelId,
          // when duplicating in existing channel, use sample track type
          type: targetParentId ? channel.type : CHANNEL_TYPE_SAMPLE_TRACK,
          startBeat: channel.startBeat,
          pitchSemitones: channel.pitchSemitones,
          delayTime: channel.delayTime,
          gain: channel.gain,
          sampleId: channel.sampleId,
          reverbSampleId: channel.reverbSampleId
        })),
        setChannelParentAction,
        ...clipCommands,
        newClipIds ? Cmd.action(setClipsChannel({
          channelId: newChannelId,
          clipIds: newClipIds
        })) : Cmd.none
      ], { sequence: true }))
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

      const channelEffects = map(channelsToMove, channel => Cmd.action(updateChannel({
        id: channel.id,
        startBeat: channel.startBeat + beatsToMove
      })))

      let updateTempoClipEffect = Cmd.none
      if (tempoControlPoints) {
        // moving to left
        if (beatsToMove < 0) {
          updateTempoClipEffect = Cmd.action(updateClip({
            id: mixTempoClip.id,
            controlPoints: keyBy(map(tempoControlPoints, (controlPoint) => {
              let newBeat = controlPoint.beat
              if (controlPoint.beat >= moveTempoControlsFromBeat) {
                newBeat += beatsToMove
              } else if (controlPoint.beat >= (moveTempoControlsFromBeat + diffBeats)) {
                newBeat += beatsToMove
              }

              return {
                ...controlPoint,
                beat: newBeat
              }
            }), 'id')
          }))
        // moving to right
        } else {
          updateTempoClipEffect = Cmd.action(updateClip({
            id: mixTempoClip.id,
            controlPoints: keyBy(map(tempoControlPoints, controlPoint => ({
              ...controlPoint,
              beat: controlPoint.beat >= moveTempoControlsFromBeat
                ? controlPoint.beat + beatsToMove
                : controlPoint.beat
            })), 'id')
          }))
        }
      }

      return loop(state, Cmd.batch([
        Cmd.action(updateChannel({
          id,
          startBeat: startBeat + beatsToMove
        }))
      ].concat(channelEffects).concat(updateTempoClipEffect)))
    },
    [moveChannel]: (state, action) => {
      const { id, startBeat, diffBeats, quantization } = action.payload

      return loop(state, Cmd.action(updateChannel({
        id,
        startBeat: quantizeBeat({ quantization, beat: diffBeats }) + startBeat
      })))
    }
  }, {
    dirty: [],
    records: {}
  })
}


// using this because batching actions wasnt working as expected
function _createTrackGroup ({
  sampleId,
  parentChannelId,
  trackGroupId = uuid(),
  primaryTrackId = uuid(),
  primaryClipAttrs = {},
  trackGroupAttrs = {},
  primaryChannelAttrs = {}
}) {
  const clipId = uuid()

  return Cmd.batch([
    Cmd.action(createClip(assign({
      id: clipId,
      sampleId,
      type: CLIP_TYPE_SAMPLE
    }, primaryClipAttrs))),
    Cmd.action(createChannel(assign({
      id: primaryTrackId,
      type: CHANNEL_TYPE_PRIMARY_TRACK,
      sampleId
    }, primaryChannelAttrs))),
    Cmd.action(setClipsChannel({
      channelId: primaryTrackId,
      clipIds: [clipId]
    })),
    Cmd.action(createChannel(assign({
      id: trackGroupId,
      type: CHANNEL_TYPE_TRACK_GROUP
    }, trackGroupAttrs))),
    Cmd.action(setChannelsParent({
      parentChannelId: trackGroupId,
      channelIds: [primaryTrackId] })),

    // this was removed because it didnt allow 2 creations at once
    // 
    // Cmd.action(setChannelsParent({
    //   parentChannelId,
    //   channelIds: [trackGroupId]
    // }))
  ])
}
