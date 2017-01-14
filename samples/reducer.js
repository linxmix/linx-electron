const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { merge, keyBy, without } = require('lodash')
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
      ...state, isLoading: true
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
      ...state, isLoading: false
    }),
    [loadSample]: (state, action) => {
      const id = action.payload
      const sample = state.records[id]
      if (sample && sample.audioBuffer) {
        return state
      } else {
        return loop({
          ...state, isLoading: true
        }, Effects.batch([
          Effects.promise(runLoadSample, action.payload.id),
          Effects.constant(loadSampleEnd())
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
      ...state, isLoading: false
    }),
    [createSample]: (state, action) => {
      const file = action.payload
      assert(file && file.path, 'Cannot createSample without file && file.path')

      return loop({
        ...state, isCreating: true
      }, Effects.batch([
        Effects.promise(runCreateSample, file),
        Effects.constant(createSampleEnd())
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
        Effects.constant(analyzeSample(id))
      ]))
    },
    [createSampleDuplicate]: (state, action) => ({
      ...state,
      records: {
        ...state.records,
        [action.payload.id]: action.payload
      }
    }),
    [createSampleFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [createSampleEnd]: (state, action) => ({
      ...state, isCreating: false
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
    isLoading: false,
    isCreating: false,
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
      .then(({ sample, file, isDuplicate }) =>
        isDuplicate ? createSampleDuplicate(sample) : createSampleSuccess({ sample, file }))
      .catch(createSampleFailure)
  }

  function runAnalyzeSample (id) {
    return service.analyzeSample(id)
      .then(analyzeSampleSuccess)
      .catch(analyzeSampleFailure)
  }
}
