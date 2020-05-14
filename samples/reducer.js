const { Cmd, loop } = require('redux-loop')
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
  readJsonAndCreateSamples,
  readJsonAndCreateSamplesSuccess,
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
    }, Cmd.batch([
      Cmd.action(loadMetaList()),
      Cmd.run(runLoadSampleList, {
        successActionCreator: loadSampleListSuccess,
        failActionCreator: loadSampleListFailure
      }),
      Cmd.action(loadSampleListEnd())
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
      }, Cmd.batch([
        Cmd.run(runLoadSamples, {
          successActionCreator: loadSamplesSuccess,
          failActionCreator: loadSamplesFailure,
          args: [unloadedSampleIds]
        }),
        Cmd.action(loadSamplesEnd(unloadedSampleIds))
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
        return loop(state, Cmd.action(loadSampleEnd(id)))
      } else {
        return loop({
          ...state,
          loading: [...state.loading, id],
          records: {
            ...state.records,
            [id]: state.records[id] || { id }
          }
        }, Cmd.batch([
          Cmd.run(runLoadSample, {
            successActionCreator: loadSampleSuccess,
            failActionCreator: loadSampleFailure,
            args: [id]
          }),
          Cmd.action(loadSampleEnd(id))
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
    }, Cmd.batch([
      Cmd.action(loadMetaList()),
      Cmd.run(runLoadReverbSampleList, {
        successActionCreator: loadReverbSampleListSuccess,
        failActionCreator: loadReverbSampleListFailure
      }),
      Cmd.action(loadReverbSampleListEnd())
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
    [readJsonAndCreateSamples]: (state, action) => {
      const { file, effectCreator } = action.payload

      return loop(state, Cmd.run(runReadJsonAndCreateSamples, {
        successActionCreator: readJsonAndCreateSamplesSuccess,
        failActionCreator: createSampleFailure,
        args: [{ file, effectCreator }]
      }))
    },
    [readJsonAndCreateSamplesSuccess]: (state, action) => {
      const { sampleInfos, transitionInfos, effectCreator } = action.payload
      const sampleSuccessEffects = sampleInfos.map(({ sample, file, isDuplicate }) =>
        Cmd.action(createSampleSuccess({ sample, title: file && file.name, isDuplicate })))
      const sampleIds = sampleInfos.map(({ sample }) => sample.id)

      const effects = sampleSuccessEffects.concat(effectCreator({
        sampleIds,
        transitionInfos
      }))

      return loop(state, Cmd.batch(effects))
    },
    [createSample]: (state, action) => {
      const { file, effectCreator } = action.payload
      assert(file && file.path, 'Cannot createSample without file && file.path')
      assert(!includes(state.creating, file.path), 'Already creating sample with file.path')

      return loop({
        ...state, creating: [...state.creating, file.path]
      }, Cmd.batch([
        Cmd.run(runCreateSample, {
          successActionCreator: createSampleSuccess,
          failActionCreator: createSampleFailure,
          args: [{ file, effectCreator }]
        }),
        Cmd.action(createSampleEnd(file.path))
      ]))
    },
    [createSampleSuccess]: (state, action) => {
      const { sample, title, effectCreator, isDuplicate } = action.payload

      if (isDuplicate) {
        return loop(state, Cmd.action(createSampleDuplicate({
          sample,
          effectCreator
        })))
      }

      const { id } = sample
      const meta = {
        id,
        title,
      }

      return loop({
        ...state,
        records: {
          ...state.records,
          [id]: sample
        }
      }, Cmd.batch([
        Cmd.action(createMeta(meta)),
        Cmd.action(saveMeta(id)),
        Cmd.action(analyzeSample({ id })),
        (effectCreator && effectCreator(id)) || Cmd.none
      ]))
    },
    [createSampleDuplicate]: (state, action) => {
      const { sample, effectCreator } = action.payload

      return loop(state, Cmd.batch([
        Cmd.action(loadSampleSuccess(sample)),
        (effectCreator && effectCreator(sample.id)) || Cmd.none
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
      }, Cmd.batch([
        Cmd.run(runAnalyzeSample, {
          successActionCreator: analyzeSampleSuccess,
          failActionCreator: analyzeSampleFailure,
          args: [{ id, startTime, endTime, effectCreator }]
        }),
        Cmd.action(analyzeSampleEnd(id))
      ]))
    },
    [analyzeSampleSuccess]: (state, action) => {
      const { id, attrs, effectCreator } = action.payload

      return loop(state, effectCreator ? effectCreator({ id, attrs }) : Cmd.batch([
        Cmd.action(updateMeta(omit(attrs, 'peaks'))),
        Cmd.action(saveMeta(id))
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
  }

  function runLoadReverbSampleList () {
    return service.readReverbSampleList()
      .then(list => map(list, ({ sample }) => sample))
  }

  function runLoadSample (id) {
    return service.readSample(id)
      .then(({ sample }) => sample)
  }

  function runLoadSamples (ids) {
    return Promise.all(map(ids, id => service.readSample(id).then(({ sample }) => sample)))
  }

  function runCreateSample ({ file, effectCreator }) {
    return service.createSample(file)
      .then(({ sample, file, isDuplicate }) => ({
        sample,
        isDuplicate,
        effectCreator,
        title: file && file.name,
      }))
  }

  function runReadJsonAndCreateSamples ({ file, effectCreator }) {
    return service.readJsonAndCreateSamples(file)
      .then(({ sampleInfos, transitionInfos }) => ({ sampleInfos, transitionInfos, effectCreator }))
  }

  function runAnalyzeSample ({ id, startTime, endTime, effectCreator }) {
    return service.analyzeSample({ id, startTime, endTime })
      .then(attrs => ({ id, attrs, effectCreator }))
  }
}
