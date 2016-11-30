const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { merge, keyBy } = require('lodash')

const {
  loadMixList,
  loadMixListSuccess,
  loadMixListFailure,
  loadMixListEnd,
  loadMix,
  loadMixSuccess,
  loadMixFailure,
  loadMixEnd
} = require('./actions')
const createService = require('./service')
const { setChannels } = require('../channels/actions')
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
    [loadMixListSuccess]: (state, action) => ({
      ...state,
      records: merge({}, state.records, keyBy(action.payload, 'id'))
    }),
    [loadMixListFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMixListEnd]: (state, action) => ({
      ...state, isLoading: false
    }),
    [loadMix]: (state, action) => loop({
      ...state, isLoading: true
    }, Effects.batch([
      Effects.promise(runLoadMix, action.payload.id),
      Effects.constant(loadMixEnd())
    ])),
    [loadMixSuccess]: (state, action) => {
      const { records } = state
      const { payload: mix } = action
      const { channelId, channels, clips } = flattenMix(mix)
      const effects = Effects.batch([
        Effects.constant(setChannels(channels))
      ])
      const nextRecords = {
        ...records,
        [mix.id]: { id: mix.id, channelId }
      }
      const nextState = { ...state, records: nextRecords }
      return loop(nextState, effects)
    },
    [loadMixFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMixEnd]: (state, action) => ({
      ...state, isLoading: false
    })
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
