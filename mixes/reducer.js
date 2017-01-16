const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { push } = require('react-router-redux')
const { pick, without, map } = require('lodash')
const uuid = require('uuid/v4')

const {
  loadMetaList,
  createMeta,
  saveMeta,
  deleteMeta
} = require('../metas/actions')
const {
  unsetChannel
} = require('../channels/actions')
const {
  createSample
} = require('../samples/actions')
const { CHANNEL_TYPE_MIX } = require('../channels/constants')

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
  navigateToMix,
  navigateToMixList
} = require('./actions')
const createService = require('./service')
const { setChannels } = require('../channels/actions')
const { setClips } = require('../clips/actions')
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
    }, Effects.batch([
      Effects.promise(runLoadMix, action.payload),
      Effects.constant(loadMixEnd(action.payload))
    ])),
    [loadMixSuccess]: (state, action) => loop({
      ...state,
      dirty: without(state.dirty, action.payload.id)
    }, Effects.constant(setMix(action.payload))),
    [loadMixFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMixEnd]: (state, action) => ({
      ...state, loading: without(state.loading, action.payload)
    }),
    [saveMix]: (state, action) => loop({
      ...state, saving: [...state.saving, action.payload.id]
    }, Effects.batch([
      Effects.promise(runSaveMix, action.payload),
      Effects.constant(saveMixEnd(action.payload.id))
    ])),
    [saveMixSuccess]: (state, action) => loop({
      ...state,
      // TODO: need to clear channel, clips dirtiness
      dirty: without(state.dirty, action.payload.id)
    }, Effects.constant(saveMeta(action.payload.id))),
    [saveMixFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [saveMixEnd]: (state, action) => ({
      ...state, saving: without(state.saving, action.payload)
    }),
    [deleteMix]: (state, action) => loop({
      ...state, saving: [...state.saving, action.payload.id]
    }, Effects.batch([
      Effects.promise(runDeleteMix, action.payload),
      Effects.constant(deleteMixEnd(action.payload.id))
    ])),
    [deleteMixSuccess]: (state, action) => {
      const nestedMix = action.payload
      const { id, channel } = nestedMix

      const nextRecords = { ...state.records }
      delete nextRecords[id]

      return loop({
        ...state,
        dirty: without(state.dirty, id),
        records: nextRecords
      }, Effects.batch([
        Effects.constant(unsetChannel(channel)),
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
    [setMix]: (state, action) => {
      const { records } = state
      const { payload: mix } = action
      const { channelId, channels, clips } = flattenMix(mix)
      const effects = Effects.batch([
        Effects.constant(setChannels(channels)),
        Effects.constant(setClips(clips))
      ])
      const nextRecords = {
        ...records,
        [mix.id]: { id: mix.id, channelId }
      }
      const nextState = { ...state, records: nextRecords }
      return loop(nextState, effects)
    },
    [createMix]: (state, action) => {
      const newMix = {
        id: uuid(),
        // TODO: this should be createMixChannel
        // TODO: make sure we are setting a flat mix in state
        channel: { id: uuid(), type: CHANNEL_TYPE_MIX }
      }

      const effects = Effects.batch([
        Effects.constant(setMix(newMix)),
        Effects.constant(createMeta({
          id: newMix.id,
          title: 'new mix title'
        })),
        Effects.constant(navigateToMix(newMix.id))
      ])
      return loop({
        ...state,
        dirty: [...state.dirty, newMix.id]
      }, effects)
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
      .catch(loadMixFailure)
  }

  function runSaveMix (nestedMix) {
    return service.saveMix(pick(nestedMix, 'id', 'channel'))
      .then(() => saveMixSuccess(nestedMix))
      .catch(saveMixFailure)
  }

  function runDeleteMix (nestedMix) {
    return service.deleteMix(nestedMix)
      .then(() => deleteMixSuccess(nestedMix))
      .catch(deleteMixFailure)
  }
}
