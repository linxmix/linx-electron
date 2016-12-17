const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { merge, keyBy } = require('lodash')
const uuid = require('uuid/v4');

const {
  loadMixList,
  loadMixListSuccess,
  loadMixListFailure,
  loadMixListEnd,
  loadMix,
  loadMixSuccess,
  loadMixFailure,
  loadMixEnd,
  setMix,
  createMix
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
      Effects.promise(runLoadMixList),
      Effects.constant(loadMixListEnd())
    ])),

    // how to get this to not run LOAD_MIX_END end until all SET_MIX are done?
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
    [loadMixSuccess]: (state, action) => loop(
      state,
      Effects.constant(setMix(action.payload))
    ),
    [loadMixFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMixEnd]: (state, action) => ({
      ...state, isLoading: false
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
    [createMix]: (state, action) => loop(
      state,
      Effects.constant(setMix({
        id: uuid(),
        channel: { id: uuid(), type: 'mix' }
      }))
    )
  }, {
    isLoading: false,
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
}
