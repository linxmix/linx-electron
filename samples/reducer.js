const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { merge, keyBy, without, includes } = require('lodash')
const assert = require('assert')

const {
  loadSampleList,
  loadSampleListSuccess,
  loadSampleListFailure,
  loadSampleListEnd,
  loadSample,
  loadSampleSuccess,
  loadSampleFailure,
  loadSampleEnd,
  createSample,
  createSampleSuccess,
  createSampleDuplicate,
  createSampleFailure,
  createSampleEnd,
  analyzeSample,
  analyzeSampleSuccess,
  analyzeSampleFailure,
  analyzeSampleEnd
} = require('./actions')
const {
  createMeta,
  updateMeta,
  saveMeta,
  loadMetaList
} = require('../metas/actions')
const createService = require('./service')

module.exports = createReducer

function createReducer (config) {
  const service = createService(config)

  return handleActions({
    [loadSampleList]: (state, action) => loop({
      ...state, isLoadingList: true
    }, Effects.batch([
      Effects.constant(loadMetaList()),
      Effects.promise(runLoadSampleList),
      Effects.constant(loadSampleListEnd())
    ])),
    [loadSampleListSuccess]: (state, action) => ({
      ...state,
      records: merge({}, state.records, keyBy(action.payload, 'id'))
    }),
    [loadSampleListFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadSampleListEnd]: (state, action) => ({
      ...state, isLoadingList: false
    }),
    [loadSample]: (state, action) => {
      const id = action.payload
      const sample = state.records[id]
      if (sample && sample.audioBuffer) {
        return state
      } else {
        return loop({
          ...state, loading: [...state.loading, id]
        }, Effects.batch([
          Effects.promise(runLoadSample, id),
          Effects.constant(loadSampleEnd(id))
        ]))
      }
    },
    [loadSampleSuccess]: (state, action) => ({
      ...state,
      records: {
        ...state.records,
        [action.payload.id]: action.payload
      }
    }),
    [loadSampleFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadSampleEnd]: (state, action) => ({
      ...state, loading: without(state.loading, action.payload)
    }),
    [createSample]: (state, action) => {
      const file = action.payload
      assert(file && file.path, 'Cannot createSample without file && file.path')
      assert(!includes(state.creating, file.path), 'Already creating sample with file.path')

      return loop({
        ...state, creating: [...state.creating, file.path]
      }, Effects.batch([
        Effects.promise(runCreateSample, file),
        Effects.constant(createSampleEnd(file.path))
      ]))
    },
    [createSampleSuccess]: (state, action) => {
      const { sample, file } = action.payload
      const { id } = sample
      const meta = {
        id,
        title: file.name
      }

      return loop({
        ...state,
        records: {
          ...state.records,
          [id]: sample
        }
      }, Effects.batch([
        Effects.constant(createMeta(meta)),
        Effects.constant(saveMeta(id)),
        Effects.constant(analyzeSample(id)),
        Effects.none() // TODO
      ]))
    },
    [createSampleDuplicate]: (state, action) => {
      const { sample } = action.payload

      return loop(state, Effects.batch([
        Effects.constant(loadSampleSuccess(sample)),
        Effects.none() // TODO
      ]))
    },
    [createSampleFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [createSampleEnd]: (state, action) => ({
      ...state, creating: without(state.creating, action.payload)
    }),
    [analyzeSample]: (state, action) => {
      const id = action.payload
      assert(id, 'Cannot analyzeSample without id')

      return loop({
        ...state, analyzing: [...state.analyzing, id]
      }, Effects.batch([
        Effects.promise(runAnalyzeSample, id),
        Effects.constant(analyzeSampleEnd(id))
      ]))
    },
    [analyzeSampleSuccess]: (state, action) => loop(state, Effects.batch([
      Effects.constant(updateMeta(action.payload)),
      Effects.constant(saveMeta(action.payload.id))
    ])),
    [analyzeSampleFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [analyzeSampleEnd]: (state, action) => ({
      ...state, analyzing: without(state.analyzing, action.payload)
    })
  }, {
    isLoadingList: false,
    creating: [],
    loading: [],
    analyzing: [],
    records: {},
    error: null
  })

  function runLoadSampleList () {
    return service.readSampleList()
      .then(loadSampleListSuccess)
      .catch(loadSampleListFailure)
  }

  function runLoadSample (id) {
    return service.readSample(id)
      .then(({ sample }) => loadSampleSuccess(sample))
      .catch(loadSampleFailure)
  }

  function runCreateSample (file) {
    return service.createSample(file)
      .then(({ sample, file, isDuplicate }) => isDuplicate
        ? createSampleDuplicate({ sample })
        : createSampleSuccess({ sample, file }))
      .catch(createSampleFailure)
  }

  function runAnalyzeSample (id) {
    return service.analyzeSample(id)
      .then(analyzeSampleSuccess)
      .catch(analyzeSampleFailure)
  }
}
