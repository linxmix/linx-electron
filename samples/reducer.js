const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { assign, get, includes, keyBy, map, omit, reduce, reject, without } = require('lodash')
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
  loadSamples,
  loadSamplesSuccess,
  loadSamplesFailure,
  loadSamplesEnd,
  loadReverbSampleList,
  loadReverbSampleListSuccess,
  loadReverbSampleListFailure,
  loadReverbSampleListEnd,
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
      records: assign({}, state.records, keyBy(action.payload, 'id'))
    }),
    [loadSampleListFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadSampleListEnd]: (state, action) => ({
      ...state, isLoadingList: false
    }),
    [loadSamples]: (state, action) => {
      const sampleIds = action.payload
      const unloadedSampleIds = reject(sampleIds, sampleId =>
        get(state, `records[${sampleId}].audioBuffer`))

      if (!unloadedSampleIds.length) { return state }

      const records = reduce(unloadedSampleIds, (records, id) => {
        records[id] = records[id] || { id }
        return records
      }, { ...state.records })

      return loop({
        ...state,
        records,
        loading: [...state.loading, ...unloadedSampleIds],
      }, Effects.batch([
        Effects.promise(runLoadSamples, unloadedSampleIds),
        Effects.constant(loadSamplesEnd(unloadedSampleIds))
      ]))
    },
    [loadSamplesSuccess]: (state, action) => ({
      ...state,
      records: assign({}, state.records, keyBy(action.payload, 'id'))
    }),
    [loadSamplesFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadSamplesEnd]: (state, action) => ({
      ...state, loading: without(state.loading, ...action.payload)
    }),
    [loadSample]: (state, action) => {
      const id = action.payload
      const sample = state.records[id]
      if (sample && sample.audioBuffer) {
        return loop(state, Effects.constant(loadSampleEnd(id)))
      } else {
        return loop({
          ...state,
          loading: [...state.loading, id],
          records: {
            ...state.records,
            [id]: state.records[id] || { id }
          }
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
    [loadReverbSampleList]: (state, action) => loop({
      ...state, isLoadingReverbList: true
    }, Effects.batch([
      Effects.constant(loadMetaList()),
      Effects.promise(runLoadReverbSampleList),
      Effects.constant(loadReverbSampleListEnd())
    ])),
    [loadReverbSampleListSuccess]: (state, action) => ({
      ...state,
      records: assign({}, state.records, keyBy(action.payload, 'id'))
    }),
    [loadReverbSampleListFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadReverbSampleListEnd]: (state, action) => ({
      ...state, isLoadingReverbList: false
    }),
    [createSample]: (state, action) => {
      const { file, effectCreator } = action.payload
      assert(file && file.path, 'Cannot createSample without file && file.path')
      assert(!includes(state.creating, file.path), 'Already creating sample with file.path')

      return loop({
        ...state, creating: [...state.creating, file.path]
      }, Effects.batch([
        Effects.promise(runCreateSample, { file, effectCreator }),
        Effects.constant(createSampleEnd(file.path))
      ]))
    },
    [createSampleSuccess]: (state, action) => {
      const { sample, file, effectCreator } = action.payload
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
        Effects.constant(analyzeSample({ id })),
        (effectCreator && effectCreator(id)) || Effects.none()
      ]))
    },
    [createSampleDuplicate]: (state, action) => {
      const { sample, effectCreator } = action.payload

      return loop(state, Effects.batch([
        Effects.constant(loadSampleSuccess(sample)),
        (effectCreator && effectCreator(sample.id)) || Effects.none()
      ]))
    },
    [createSampleFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [createSampleEnd]: (state, action) => ({
      ...state, creating: without(state.creating, action.payload)
    }),
    [analyzeSample]: (state, action) => {
      const { id, startTime, endTime, effectCreator } = action.payload
      assert(id, 'Cannot analyzeSample without id')

      return loop({
        ...state, analyzing: [...state.analyzing, id]
      }, Effects.batch([
        Effects.promise(runAnalyzeSample, { id, startTime, endTime, effectCreator }),
        Effects.constant(analyzeSampleEnd(id))
      ]))
    },
    [analyzeSampleSuccess]: (state, action) => {
      const { id, attrs, effectCreator } = action.payload

      return loop(state, effectCreator ? effectCreator({ id, attrs }) : Effects.batch([
        Effects.constant(updateMeta(omit(attrs, 'peaks'))),
        Effects.constant(saveMeta(id))
      ]))
    },
    [analyzeSampleFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [analyzeSampleEnd]: (state, action) => ({
      ...state, analyzing: without(state.analyzing, action.payload)
    })
  }, {
    isLoadingList: false,
    isLoadingReverbList: false,
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

  function runLoadReverbSampleList () {
    return service.readReverbSampleList()
      .then(list => loadReverbSampleListSuccess(map(list, ({ sample }) => sample)))
      .catch(loadReverbSampleListFailure)
  }

  function runLoadSample (id) {
    return service.readSample(id)
      .then(({ sample }) => loadSampleSuccess(sample))
      .catch(loadSampleFailure)
  }

  function runLoadSamples (ids) {
    return Promise.all(map(ids, id => service.readSample(id).then(({ sample }) => sample)))
      .then(loadSamplesSuccess)
      .catch(loadSamplesFailure)
  }

  function runCreateSample ({ file, effectCreator }) {
    return service.createSample(file)
      .then(({ sample, file, isDuplicate }) => isDuplicate
        ? createSampleDuplicate({ sample, effectCreator })
        : createSampleSuccess({ sample, file, effectCreator }))
      .catch(createSampleFailure)
  }

  function runAnalyzeSample ({ id, startTime, endTime, effectCreator }) {
    return service.analyzeSample({ id, startTime, endTime })
      .then(attrs => analyzeSampleSuccess({ id, attrs, effectCreator }))
      .catch(analyzeSampleFailure)
  }
}
