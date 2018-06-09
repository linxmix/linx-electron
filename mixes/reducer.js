const { Cmd, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { push } = require('react-router-redux')
const { cloneDeep, get, keyBy, mapValues, uniq, without, map, omit,
  values, filter, forEach, reduce } = require('lodash')
const uuid = require('uuid/v4')
const assert = require('assert')

const {
  loadMetaList,
  createMeta,
  saveMeta,
  deleteMeta
} = require('../metas/actions')
const {
  unsetChannel,
  createChannel,
  duplicateTrackGroup,
  setChannels,
  undirtyChannels,
  setClipsChannel
} = require('../channels/actions')
const {
  loadSamples
} = require('../samples/actions')
const {
  setClips,
  undirtyClips,
  createClip
} = require('../clips/actions')
const { CHANNEL_TYPE_MIX } = require('../channels/constants')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_TEMPO } = require('../clips/constants')

const {
  loadMixList,
  loadMixListSuccess,
  loadMixListFailure,
  loadMixListEnd,
  loadMix,
  loadMixSuccess,
  loadMixFailure,
  loadMixEnd,
  saveMix,
  saveMixSuccess,
  saveMixFailure,
  saveMixEnd,
  deleteMix,
  deleteMixSuccess,
  deleteMixFailure,
  deleteMixEnd,
  setMix,
  createMix,
  duplicateMix,
  unsetTrackGroupFromMix,
  navigateToMix,
  navigateToMixList
} = require('./actions')
const createService = require('./service')
const flattenMix = require('./helpers/flatten')

module.exports = createReducer

function createReducer (config) {
  const service = createService(config)

  return handleActions({
    [setMix]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, action.payload.id),
      records: {
        ...state.records,
        [action.payload.id]: action.payload
      }
    }),
    [loadMixList]: (state, action) => loop({
      ...state, isLoadingList: true
    }, Cmd.batch([
      Cmd.action(loadMetaList()),
      Cmd.run(runLoadMixList, {
        successActionCreator: loadMixListSuccess,
        failActionCreator: loadMixListFailure
      }),
      Cmd.action(loadMixListEnd())
    ])),
    [loadMixListSuccess]: (state, action) => {
      const records = reduce(action.payload, (records, mix) => {
        records[mix.id] = mix
        return records
      }, { ...state.records })

      return {
        ...state,
        records,
        dirty: without(state.dirty, ...map(action.payload, 'id'))
      }
    },
    [loadMixListFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMixListEnd]: (state, action) => ({
      ...state, isLoadingList: false
    }),
    [loadMix]: (state, action) => loop({
      ...state, loading: [...state.loading, action.payload]
    }, Cmd.batch([
      Cmd.action(loadMetaList()),
      Cmd.run(runLoadMix, {
        successActionCreator: loadMixSuccess,
        failActionCreator: loadMixFailure,
        args: [action.payload]
      })
    ])),
    [loadMixSuccess]: (state, action) => {
      // TODO: convert to flattenChannel, action.payload.channel
      const { id, channelId, channels, clips } = flattenMix(action.payload)
      const mix = { id, channelId }

      const clipSampleIds = map(
        uniq(map(filter(values(clips), { type: CLIP_TYPE_SAMPLE }), 'sampleId')),
      )

      return loop(state, Cmd.batch([
        Cmd.action(setMix(mix)),
        Cmd.action(setChannels(channels)),
        Cmd.action(setClips(clips)),
        Cmd.action(loadSamples(clipSampleIds)),
        Cmd.action(loadMixEnd(id))
      ]))
    },
    [loadMixFailure]: (state, action) => loop({
      ...state, error: action.payload.error.message
    }, Cmd.action(loadMixEnd(action.payload.id))),
    [loadMixEnd]: (state, action) => ({
      ...state, loading: without(state.loading, action.payload)
    }),
    [saveMix]: (state, action) => loop({
      ...state, saving: [...state.saving, action.payload.id]
    }, Cmd.batch([
      Cmd.run(runSaveMix, {
        successActionCreator: saveMixSuccess,
        failActionCreator: saveMixFailure,
        args: [action.payload]
      }),
      Cmd.action(saveMixEnd(action.payload.id))
    ])),
    [saveMixSuccess]: (state, action) => {
      // TODO: convert to flattenChannel, action.payload.channel
      const { id, channels, clips } = flattenMix(action.payload)

      return loop({
        ...state,
        dirty: without(state.dirty, id)
      }, Cmd.batch([
        Cmd.action(undirtyChannels(map(channels, 'id'))),
        Cmd.action(undirtyClips(map(clips, 'id'))),
        Cmd.action(saveMeta(id))
      ]))
    },
    [saveMixFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [saveMixEnd]: (state, action) => ({
      ...state, saving: without(state.saving, action.payload)
    }),
    [deleteMix]: (state, action) => loop({
      ...state, saving: [...state.saving, action.payload]
    }, Cmd.batch([
      Cmd.run(runDeleteMix, {
        successActionCreator: deleteMixSuccess,
        failActionCreator: deleteMixFailure,
        args: [action.payload]
      }),
      Cmd.action(deleteMixEnd(action.payload))
    ])),
    [deleteMixSuccess]: (state, action) => {
      const { id, channelId } = state.records[action.payload]

      return loop({
        ...state,
        dirty: without(state.dirty, id),
        records: omit(state.records, id)
      }, Cmd.batch([
        Cmd.action(unsetChannel(channelId)),
        Cmd.action(deleteMeta(id)),
        Cmd.action(navigateToMixList())
      ]))
    },
    [deleteMixFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [deleteMixEnd]: (state, action) => ({
      ...state, saving: without(state.saving, action.payload)
    }),
    [createMix]: (state, action) => {
      const newMix = { id: uuid(), channelId: uuid() }
      const tempoClipId = uuid()

      return loop({
        ...state,
        dirty: [...state.dirty, newMix.id],
        records: {
          ...state.records,
          [newMix.id]: newMix,
        }
      }, Cmd.batch([
        Cmd.action(createChannel({
          id: newMix.channelId,
          type: CHANNEL_TYPE_MIX
        })),
        Cmd.action(createClip({
          id: tempoClipId,
          type: CLIP_TYPE_TEMPO
        })),
        Cmd.action(setClipsChannel({
          channelId: newMix.channelId,
          clipIds: [tempoClipId]
        })),
        Cmd.action(createMeta({
          id: newMix.id,
          title: 'new mix title'
        })),
        Cmd.action(navigateToMix(newMix.id))
      ]))
    },
    [duplicateMix]: (state, action) => {
      const previousMix = action.payload.mix
      const previousTempoClip = previousMix.tempoClip

      const newMix = {
        id: uuid(),
        channelId: uuid()
      }
      const tempoClipId = uuid()

      const duplicateTrackGroupActions = map(
        get(previousMix, 'channel.channels'),
        (channel) => Cmd.action(duplicateTrackGroup({
          channel,
          targetParentId: newMix.channelId
        }))
      )

      return loop({
        ...state,
        records: {
          ...state.records,
          [newMix.id]: newMix
        }
      }, Cmd.list([
        Cmd.list([
          Cmd.action(createChannel({
            id: newMix.channelId,
            type: CHANNEL_TYPE_MIX
          })),
          Cmd.action(createClip({
            id: tempoClipId,
            type: CLIP_TYPE_TEMPO,
            controlPoints: keyBy(
              mapValues(previousTempoClip.controlPoints || [], ({ beat, value }) => ({
                id: uuid(),
                beat,
                value
              })),
              'id'
            )
          })),
          Cmd.action(setClipsChannel({
            channelId: newMix.channelId,
            clipIds: [tempoClipId]
          })),
          Cmd.action(createMeta({
            id: newMix.id,
            title: `${previousMix.meta.title} - Copy`
          }))
        ], { batch: true }),
        Cmd.list(duplicateTrackGroupActions, { sequence: true }),
        Cmd.action(navigateToMix(newMix.id))
      ], { sequence: true }))
    },
    [unsetTrackGroupFromMix]: (state, action) => {
      const { id, trackGroupId } = action.payload
      assert(id && trackGroupId, 'Must provide id && trackGroupId')

      return loop({
        ...state,
        dirty: [...state.dirty, id]
      }, Cmd.action(unsetChannel(trackGroupId)))
    },
    [navigateToMix]: (state, action) => loop(state,
      Cmd.action(push(`/mixes/${action.payload}`))),
    [navigateToMixList]: (state, action) => loop(state,
      Cmd.action(push('/mixes/')))
  }, {
    isLoadingList: false,
    loading: [],
    saving: [],
    dirty: [],
    records: {},
    error: null
  })

  function runLoadMixList () {
    return service.readMixList()
  }

  function runLoadMix (id) {
    return service.readMix(id)
      .catch(error => ({ error, id }))
  }

  function runSaveMix (nestedMix) {
    return service.saveMix({
      id: nestedMix.id,
      channel: _removeFieldsNotToSave(cloneDeep(nestedMix.channel))
    }).then(() => nestedMix)
  }

  function runDeleteMix (id) {
    if (window.confirm('Are you sure to you want to delete this mix?')) {
      return service.deleteMix(id)
        .then(() => id)
    } else {
      return Promise.reject({ message: 'User canceled delete.' })
    }
  }
}

const CHANNEL_PROPERTIES_TO_REMOVE = [
  'parentChannel',
  'primaryTrack',
  'sampleTracks',
  'reverbSample',
  'sample',
  'tempoClip'
]

const CLIP_PROPERTIES_TO_REMOVE = [
  'channel',
  'sample',
  'gridMarkers'
]

const CONTROL_POINT_PROPERTIES_TO_REMOVE = [
  'clip'
]

function _removeFieldsNotToSave (channel) {
  forEach(CHANNEL_PROPERTIES_TO_REMOVE, property => {
    channel[property] = undefined
    delete channel[property]
  })

  forEach(channel.clips || [], clip => {
    forEach(CLIP_PROPERTIES_TO_REMOVE, property => {
      clip[property] = undefined
      delete clip[property]
    })

    forEach(clip.controlPoints || [], controlPoint => {
      forEach(CONTROL_POINT_PROPERTIES_TO_REMOVE, property => {
        controlPoint[property] = undefined
        delete controlPoint[property]
      })
    })
  })

  forEach(channel.channels || [], _removeFieldsNotToSave)
  return channel
}
