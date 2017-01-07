const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { merge, keyBy } = require('lodash')
const assert = require('assert')

const {
  loadMetaList,
  loadMetaListSuccess,
  loadMetaListFailure,
  loadMetaListEnd,
  loadMeta,
  loadMetaSuccess,
  loadMetaFailure,
  loadMetaEnd,
  saveMeta,
  saveMetaSuccess,
  saveMetaFailure,
  saveMetaEnd,
  deleteMeta,
  deleteMetaSuccess,
  deleteMetaFailure,
  deleteMetaEnd,
  createMeta,
  updateMeta
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
    }),
    [saveMeta]: (state, action) => loop({
      ...state, isSaving: true
    }, Effects.batch([
      Effects.promise(runSaveMeta, action.payload),
      Effects.constant(saveMetaEnd())
    ])),
    [saveMetaSuccess]: (state, action) => state,
    [saveMetaFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [saveMetaEnd]: (state, action) => ({
      ...state, isSaving: false
    }),
    [deleteMeta]: (state, action) => loop({
      ...state, isSaving: true
    }, Effects.batch([
      Effects.promise(runDeleteMeta, action.payload),
      Effects.constant(deleteMetaEnd())
    ])),
    [deleteMetaSuccess]: (state, action) => {
      const metaId = action.payload

      const nextRecords = { ...state.records }
      delete nextRecords[metaId]

      return { ...state, records: nextRecords }
    },
    [deleteMetaFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [deleteMetaEnd]: (state, action) => ({
      ...state, isSaving: false
    }),
    [createMeta]: (state, action) => {
      const { id } = action.payload
      assert(id, 'Cannot createMeta without id')

      return {
        ...state,
        records: {
          ...state.records,
          [id]: action.payload
        }
      }
    },
    [updateMeta]: (state, action) => {
      const { id } = action.payload
      assert(id, 'Cannot updateMeta without id')
      console.log('')

      return {
        ...state,
        records: {
          ...state.records,
          [id]: merge(state.records[id], action.payload)
        }
      }
    }
  }, {
    isLoading: false,
    isSaving: false,
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

  function runSaveMeta (meta) {
    return service.saveMeta(meta)
      .then(() => saveMetaSuccess(meta))
      .catch(saveMetaFailure)
  }

  function runDeleteMeta (id) {
    return service.deleteMeta(id)
      .then(() => deleteMetaSuccess(id))
      .catch(deleteMetaFailure)
  }
}
