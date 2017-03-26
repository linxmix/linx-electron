const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { push } = require('react-router-redux')
const { pick, without, map, omit, values, filter } = require('lodash')
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
  swapPrimaryTracks
} = require('../channels/actions')
const {
  loadSample
} = require('../samples/actions')
const { CHANNEL_TYPE_MIX } = require('../channels/constants')
const { CLIP_TYPE_SAMPLE } = require('../clips/constants')

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
  reorderPrimaryTrack,
  unsetPrimaryTrackFromMix,
  navigateToMix,
  navigateToMixList
} = require('./actions')
const createService = require('./service')
const { setChannels, undirtyChannels } = require('../channels/actions')
const { setClips, undirtyClips } = require('../clips/actions')
const flattenMix = require('./helpers/flatten')

module.exports = createReducer

function createReducer (config) {
  const service = createService(config)

  return handleActions({
    [loadMixList]: (state, action) => loop({
      ...state, isLoadingList: true
    }, Effects.batch([
      Effects.constant(loadMetaList()),
      Effects.promise(runLoadMixList),
      Effects.constant(loadMixListEnd())
    ])),
    [loadMixListSuccess]: (state, action) => loop(state, Effects.batch(
      map(action.payload, mix => Effects.constant(setMix(mix)))
    )),
    [loadMixListFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMixListEnd]: (state, action) => ({
      ...state, isLoadingList: false
    }),
    [loadMix]: (state, action) => loop({
      ...state, loading: [...state.loading, action.payload]
    }, Effects.promise(runLoadMix, action.payload)),
    [loadMixSuccess]: (state, action) => {
      // TODO: convert to flattenChannel, action.payload.channel
      const { id, channelId, channels, clips } = flattenMix(action.payload)
      const mix = { id, channelId }

      const loadSampleEffects = map(
        filter(values(clips), { type: CLIP_TYPE_SAMPLE }),
        clip => Effects.constant(loadSample(clip.sampleId))
      )

      return loop({
        ...state,
        dirty: without(state.dirty, mix.id)
      }, Effects.batch([
        Effects.constant(setMix(mix)),
        Effects.constant(setChannels(channels)),
        Effects.constant(setClips(clips)),
        Effects.constant(loadMixEnd(id))
      ].concat(loadSampleEffects)))
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
    [setMix]: (state, action) => ({
      ...state,
      records: {
        ...state.records,
        [action.payload.id]: action.payload
      }
    }),
    [createMix]: (state, action) => {
      const newMix = { id: uuid(), channelId: uuid() }

      return loop({
        ...state,
        dirty: [...state.dirty, newMix.id]
      }, Effects.batch([
        Effects.constant(createChannel({
          id: newMix.channelId,
          type: CHANNEL_TYPE_MIX
        })),
        Effects.constant(createMeta({
          id: newMix.id,
          title: 'new mix title'
        })),
        Effects.constant(setMix(newMix)),
        Effects.constant(navigateToMix(newMix.id))
      ]))
    },
    [reorderPrimaryTrack]: (state, action) => {
      const { targetIndex, sourceIndex, tracks } = action.payload
      if (sourceIndex === targetIndex) { return state }

      assert(sourceIndex >= 0 && sourceIndex < tracks.length,
        'Must provide valid sourceIndex')
      assert(targetIndex >= -1 && targetIndex < tracks.length,
        'Must provide valid targetIndex')

      let effects = []

      // forward swap
      if (sourceIndex < targetIndex) {
        for (let i = sourceIndex + 1; i <= targetIndex; i++) {
          effects.push(Effects.constant(swapPrimaryTracks({
            sourceId: tracks[sourceIndex].id,
            targetId: tracks[i].id
          })))
        }

      // backward swap
      } else {
        for (let i = sourceIndex; i > targetIndex; i--) {
          effects.push(Effects.constant(swapPrimaryTracks({
            sourceId: tracks[sourceIndex].id,
            targetId: tracks[i].id
          })))
        }
      }

      return loop(state, Effects.batch(effects))
    },
    [unsetPrimaryTrackFromMix]: (state, action) => {
      const { id, primaryTrackId } = action.payload
      assert(id && primaryTrackId, 'Must provide id && primaryTrackId')

      // TODO(FUTURE): remove associated transition and move later tracks forward
      return loop(state, Effects.constant(unsetChannel(primaryTrackId)))
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
    return service.saveMix(pick(nestedMix, ['id', 'channel']))
      .then(() => saveMixSuccess(nestedMix))
      .catch(saveMixFailure)
  }

  function runDeleteMix (id) {
    return service.deleteMix(id)
      .then(() => deleteMixSuccess(id))
      .catch(deleteMixFailure)
  }
}
