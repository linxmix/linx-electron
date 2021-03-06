const { Cmd, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { assign, keyBy, without, omit } = require('lodash')
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
  updateMeta,
  updateAndSaveMeta
} = require('./actions')
const createService = require('./service')

module.exports = createReducer

function createReducer (config) {
  const service = createService(config)

  return handleActions({
    [loadMetaList]: (state, action) => loop({
      ...state, isLoadingList: true
    }, Cmd.batch([
      Cmd.run(runLoadMetaList, {
        successActionCreator: loadMetaListSuccess,
        failActionCreator: loadMetaListFailure,
      }),
      Cmd.action(loadMetaListEnd())
    ])),
    [loadMetaListSuccess]: (state, action) => ({
      ...state,
      records: assign({}, state.records, keyBy(action.payload, 'id'))
    }),
    [loadMetaListFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMetaListEnd]: (state, action) => ({
      ...state, isLoadingList: false
    }),
    [loadMeta]: (state, action) => loop({
      ...state, loading: [...state.loading, action.payload]
    }, Cmd.batch([
      Cmd.run(runLoadMeta, {
        successActionCreator: loadMetaSuccess,
        failActionCreator: loadMetaFailure,
        args: [action.payload]
      }),
      Cmd.action(loadMetaEnd(action.payload))
    ])),
    [loadMetaSuccess]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, action.payload.id),
      records: {
        ...state.records,
        [action.payload.id]: action.payload
      }
    }),
    [loadMetaFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMetaEnd]: (state, action) => ({
      ...state, loading: without(state.loading, action.payload)
    }),
    [saveMeta]: (state, action) => loop({
      ...state, saving: [...state.saving, action.payload]
    }, Cmd.batch([
      Cmd.run(runSaveMeta, {
        successActionCreator: saveMetaSuccess,
        failActionCreator: saveMetaFailure,
        args: [state.records[action.payload]]
      }),
      Cmd.action(saveMetaEnd(action.payload))
    ])),
    [saveMetaSuccess]: (state, action) => ({
      ...state, dirty: without(state.dirty, action.payload.id)
    }),
    [saveMetaFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [saveMetaEnd]: (state, action) => ({
      ...state, saving: without(state.saving, action.payload)
    }),
    [deleteMeta]: (state, action) => loop({
      ...state, isSaving: true
    }, Cmd.batch([
      Cmd.run(runDeleteMeta, {
        successActionCreator: deleteMetaSuccess,
        failActionCreator: deleteMetaFailure,
        args: [action.payload]
      }),
      Cmd.action(deleteMetaEnd(action.payload))
    ])),
    [deleteMetaSuccess]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, action.payload),
      records: omit(state.records, action.payload)
    }),
    [deleteMetaFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [deleteMetaEnd]: (state, action) => ({
      ...state, saving: without(state.saving, action.payload)
    }),
    [createMeta]: (state, action) => {
      const { id } = action.payload
      assert(id, 'Cannot createMeta without id')
      action.payload.createdAt = Date.now()

      return {
        ...state,
        dirty: [...state.dirty, id],
        records: {
          ...state.records,
          [id]: action.payload
        }
      }
    },
    [updateMeta]: (state, action) => {
      const { id } = action.payload
      assert(id, 'Cannot updateMeta without id')
      action.payload.updatedAt = Date.now()

      return {
        ...state,
        dirty: [...state.dirty, id],
        records: {
          ...state.records,
          [id]: assign({}, state.records[id], action.payload)
        }
      }
    },
    [updateAndSaveMeta]: (state, action) => loop(state, Cmd.batch([
      Cmd.action(updateMeta(action.payload)),
      Cmd.action(saveMeta(action.payload.id))
    ]))
  }, {
    isLoadingList: false,
    loading: [],
    saving: [],
    dirty: [],
    records: {},
    error: null
  })

  function runLoadMetaList () {
    return service.readMetaList()
  }

  function runLoadMeta (id) {
    return service.readMeta(id)
      .then(loadMetaSuccess)
      .catch(loadMetaFailure)
  }

  function runSaveMeta (meta) {
    return service.saveMeta(meta)
      .then(() => meta)
  }

  function runDeleteMeta (id) {
    return service.deleteMeta(id)
      .then(() => id)
  }
}
