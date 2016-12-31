const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { push } = require('react-router-redux')
const { merge, keyBy } = require('lodash')
const uuid = require('uuid/v4');

const {
  loadMetaList,
  createMeta,
  // saveMeta
} = require('../metas/actions')

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
  setMix,
  navigateToMix,
  createMix,
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
      ...state, isLoading: true
    }, Effects.batch([
      Effects.constant(loadMetaList()), // TODO: load metas here, or in getMixes getter?
      Effects.promise(runLoadMixList),
      Effects.constant(loadMixListEnd())
    ])),
    [loadMixListSuccess]: (state, action) => loop(state, Effects.batch(
      action.payload.map((mix) => Effects.constant(setMix(mix)))
    )),
    [loadMixListFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMixListEnd]: (state, action) => ({
      ...state, isLoading: false
    }),
    [loadMix]: (state, action) => loop({
      ...state, isLoading: true
    }, Effects.batch([
      Effects.promise(runLoadMix, action.payload),
      Effects.constant(loadMixEnd())
    ])),
    [loadMixSuccess]: (state, action) => loop(state, Effects.constant(setMix(action.payload))),
    [loadMixFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMixEnd]: (state, action) => ({
      ...state, isLoading: false
    }),
    [saveMix]: (state, action) => loop({
      ...state, isSaving: true
    }, Effects.batch([
      // currently, the component passes a nestedMix as action.payload
      // maybe in the future we should pass mixId and call nestMix with channels, clips
      Effects.promise(runSaveMix, action.payload),
      Effects.constant(saveMixEnd())
    ])),
    [saveMixSuccess]: (state, action) => state,
    [saveMixFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [saveMixEnd]: (state, action) => ({
      ...state, isSaving: false
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
        channel: { id: uuid(), type: 'mix' }
      }
      const effects = Effects.batch([
        Effects.constant(setMix(newMix)),
        Effects.constant(createMeta({
          id: newMix.id,
          title: 'new mix title',
        })),
        Effects.constant(navigateToMix(newMix.id))
      ])
      return loop(state, effects);
    },
    [navigateToMix]: (state, action) => loop(state,
      Effects.constant(push(`/mixes/${action.payload}`))),
  }, {
    isLoading: false,
    isSaving: false,
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

  function runSaveMix (mix) {
    return service.saveMix(mix)
      .then(saveMixSuccess)
      .catch(saveMixFailure)
  }
}
