const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { merge, keyBy } = require('lodash')

const {
  loadMetaList,
  loadMetaListSuccess,
  loadMetaListFailure,
  loadMetaListEnd,
  loadMeta,
  loadMetaSuccess,
  loadMetaFailure,
  loadMetaEnd
} = require('./actions')
const createService = require('./service')

module.exports = createReducer

function createReducer (config) {
  const service = createService(config)

  return handleActions({
    [loadMetaList]: (state, action) => loop({
      ...state, isLoading: true
    }, Effects.batch([
      Effects.promise(runLoadMetaList),
      Effects.constant(loadMetaListEnd())
    ])),
    [loadMetaListSuccess]: (state, action) => ({
      ...state,
      records: merge({}, state.records, keyBy(action.payload, 'id'))
    }),
    [loadMetaListFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMetaListEnd]: (state, action) => ({
      ...state, isLoading: false
    }),
    [loadMeta]: (state, action) => loop({
      ...state, isLoading: true
    }, Effects.batch([
      Effects.promise(runLoadMeta, action.payload.id),
      Effects.constant(loadMetaEnd())
    ])),
    [loadMetaSuccess]: (state, action) => ({
      ...state,
      records: {
        ...state.records,
        [action.payload.id]: action.payload
      }
    }),
    [loadMetaFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMetaEnd]: (state, action) => ({
      ...state, isLoading: false
    })
  }, {
    isLoading: false,
    records: {},
    error: null
  })

  function runLoadMetaList () {
    return service.readMetaList()
      .then(loadMetaListSuccess)
      .catch(loadMetaListFailure)
  }

  function runLoadMeta (id) {
    return service.readMeta(id)
      .then(loadMetaSuccess)
      .catch(loadMetaFailure)
  }
}
