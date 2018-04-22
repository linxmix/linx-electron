const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { push } = require('react-router-redux')
const { cloneDeep, compact, concat, uniq, pick, without, map, omit,
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
  swapChannels,
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
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_TEMPO, CONTROL_TYPE_REVERB } = require('../clips/constants')

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
    }, Effects.batch([
      Effects.constant(loadMetaList()),
      Effects.promise(runLoadMixList),
      Effects.constant(loadMixListEnd())
    ])),
    [loadMixListSuccess]: (state, action) => {
      const records = reduce(action.payload, (records, mix) => {
        records[mix.id] = mix
        return records
      }, { ...state.records })

      return {
        ...state,
        records,
        dirty: without(state.dirty, ...map(action.payload, 'id')),
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
    }, Effects.batch([
      Effects.constant(loadMetaList()),
      Effects.promise(runLoadMix, action.payload)
    ])),
    [loadMixSuccess]: (state, action) => {
      // TODO: convert to flattenChannel, action.payload.channel
      const { id, channelId, channels, clips } = flattenMix(action.payload)
      const mix = { id, channelId }

      const clipSampleIds = map(
        uniq(map(filter(values(clips), { type: CLIP_TYPE_SAMPLE }), 'sampleId')),
      )

      return loop(state, Effects.batch([
        Effects.constant(setMix(mix)),
        Effects.constant(setChannels(channels)),
        Effects.constant(setClips(clips)),
        Effects.constant(loadSamples(clipSampleIds)),
        Effects.constant(loadMixEnd(id)),
      ]))
    },
    [loadMixFailure]: (state, action) => loop({
      ...state, error: action.payload.error.message
    }, Effects.constant(loadMixEnd(action.payload.id))),
    [loadMixEnd]: (state, action) => ({
      ...state, loading: without(state.loading, action.payload)
    }),
    [saveMix]: (state, action) => loop({
      ...state, saving: [...state.saving, action.payload.id]
    }, Effects.batch([
      Effects.promise(runSaveMix, action.payload),
      Effects.constant(saveMixEnd(action.payload.id))
    ])),
    [saveMixSuccess]: (state, action) => {
      // TODO: convert to flattenChannel, action.payload.channel
      const { id, channels, clips } = flattenMix(action.payload)

      return loop({
        ...state,
        dirty: without(state.dirty, id)
      }, Effects.batch([
        Effects.constant(undirtyChannels(map(channels, 'id'))),
        Effects.constant(undirtyClips(map(clips, 'id'))),
        Effects.constant(saveMeta(id))
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
    }, Effects.batch([
      Effects.promise(runDeleteMix, action.payload),
      Effects.constant(deleteMixEnd(action.payload))
    ])),
    [deleteMixSuccess]: (state, action) => {
      const { id, channelId } = state.records[action.payload]

      return loop({
        ...state,
        dirty: without(state.dirty, id),
        records: omit(state.records, id)
      }, Effects.batch([
        Effects.constant(unsetChannel(channelId)),
        Effects.constant(deleteMeta(id)),
        Effects.constant(navigateToMixList())
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
      }, Effects.batch([
        Effects.constant(createChannel({
          id: newMix.channelId,
          type: CHANNEL_TYPE_MIX
        })),
        Effects.constant(createClip({
          id: tempoClipId,
          type: CLIP_TYPE_TEMPO
        })),
        Effects.constant(setClipsChannel({
          channelId: newMix.channelId,
          clipIds: [tempoClipId]
        })),
        Effects.constant(createMeta({
          id: newMix.id,
          title: 'new mix title'
        })),
        Effects.constant(navigateToMix(newMix.id))
      ]))
    },
    [unsetTrackGroupFromMix]: (state, action) => {
      const { id, trackGroupId } = action.payload
      assert(id && trackGroupId, 'Must provide id && trackGroupId')

      return loop({
        ...state,
        dirty: [...state.dirty, id]
      }, Effects.constant(unsetChannel(trackGroupId)))
    },
    [navigateToMix]: (state, action) => loop(state,
      Effects.constant(push(`/mixes/${action.payload}`))),
    [navigateToMixList]: (state, action) => loop(state,
      Effects.constant(push('/mixes/')))
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
      .then(loadMixListSuccess)
      .catch(loadMixListFailure)
  }

  function runLoadMix (id) {
    return service.readMix(id)
      .then(loadMixSuccess)
      .catch(error => loadMixFailure({ error, id }))
  }

  function runSaveMix (nestedMix) {
    return service.saveMix({
      id: nestedMix.id,
      channel: _removeFieldsNotToSave(cloneDeep(nestedMix.channel))
    })
      .then(() => saveMixSuccess(nestedMix))
      .catch(saveMixFailure)
  }

  function runDeleteMix (id) {
    if (window.confirm('Are you sure to you want to delete this mix?')) {
      return service.deleteMix(id)
        .then(() => deleteMixSuccess(id))
        .catch(deleteMixFailure);
    } else {
      return Promise.resolve(deleteMixFailure({ message: 'User canceled delete.' }));
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

function _removeFieldsNotToSave(channel) {
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
