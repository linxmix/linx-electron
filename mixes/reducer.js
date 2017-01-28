const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { push } = require('react-router-redux')
const { pick, without, map } = require('lodash')
const uuid = require('uuid/v4')
const assert = require('assert')

const {
  loadMetaList,
  createMeta,
  saveMeta,
  deleteMeta
} = require('../metas/actions')
const {
  unsetChannel,
  createChannel,
  updateChannel
} = require('../channels/actions')
const { CHANNEL_TYPE_MIX } = require('../channels/constants')

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
  deleteMix,
  deleteMixSuccess,
  deleteMixFailure,
  deleteMixEnd,
  setMix,
  createMix,
  reorderPrimaryTrack,
  swapPrimaryTracks,
  navigateToMix,
  navigateToMixList
} = require('./actions')
const createService = require('./service')
const { setChannels, undirtyChannels } = require('../channels/actions')
const { setClips, undirtyClips } = require('../clips/actions')
const flattenMix = require('./helpers/flatten')

module.exports = createReducer

function createReducer (config) {
  const service = createService(config)

  return handleActions({
    [loadMixList]: (state, action) => loop({
      ...state, isLoadingList: true
    }, Effects.batch([
      Effects.constant(loadMetaList()),
      Effects.promise(runLoadMixList),
      Effects.constant(loadMixListEnd())
    ])),
    [loadMixListSuccess]: (state, action) => loop(state, Effects.batch(
      map(action.payload, mix => Effects.constant(setMix(mix)))
    )),
    [loadMixListFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMixListEnd]: (state, action) => ({
      ...state, isLoadingList: false
    }),
    [loadMix]: (state, action) => loop({
      ...state, loading: [...state.loading, action.payload]
    }, Effects.batch([
      Effects.promise(runLoadMix, action.payload),
      Effects.constant(loadMixEnd(action.payload))
    ])),
    [loadMixSuccess]: (state, action) => {
      // TODO: convert to flattenChannel, action.payload.channel
      const { id, channelId, channels, clips } = flattenMix(action.payload)
      const mix = { id, channelId }

      return loop({
        ...state,
        dirty: without(state.dirty, mix.id)
      }, Effects.batch([
        Effects.constant(setMix(mix)),
        Effects.constant(setChannels(channels)),
        Effects.constant(setClips(clips))
      ]))
    },
    [loadMixFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [loadMixEnd]: (state, action) => ({
      ...state, loading: without(state.loading, action.payload)
    }),
    [saveMix]: (state, action) => loop({
      ...state, saving: [...state.saving, action.payload.id]
    }, Effects.batch([
      Effects.promise(runSaveMix, action.payload),
      Effects.constant(saveMixEnd(action.payload.id))
    ])),
    [saveMixSuccess]: (state, action) => {
      // TODO: convert to flattenChannel, action.payload.channel
      const { id, channels, clips } = flattenMix(action.payload)

      return loop({
        ...state,
        dirty: without(state.dirty, id)
      }, Effects.batch([
        Effects.constant(undirtyChannels(channels)),
        Effects.constant(undirtyClips(clips)),
        Effects.constant(saveMeta(id))
      ]))
    },
    [saveMixFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [saveMixEnd]: (state, action) => ({
      ...state, saving: without(state.saving, action.payload)
    }),
    [deleteMix]: (state, action) => loop({
      ...state, saving: [...state.saving, action.payload.id]
    }, Effects.batch([
      Effects.promise(runDeleteMix, action.payload),
      Effects.constant(deleteMixEnd(action.payload.id))
    ])),
    [deleteMixSuccess]: (state, action) => {
      const nestedMix = action.payload
      const { id, channel } = nestedMix

      const nextRecords = { ...state.records }
      delete nextRecords[id]

      return loop({
        ...state,
        dirty: without(state.dirty, id),
        records: nextRecords
      }, Effects.batch([
        Effects.constant(unsetChannel(channel)),
        Effects.constant(deleteMeta(id)),
        Effects.constant(navigateToMixList())
      ]))
    },
    [deleteMixFailure]: (state, action) => ({
      ...state, error: action.payload.message
    }),
    [deleteMixEnd]: (state, action) => ({
      ...state, saving: without(state.saving, action.payload)
    }),
    [setMix]: (state, action) => ({
      ...state,
      records: {
        ...state.records,
        [action.payload.id]: action.payload
      }
    }),
    [createMix]: (state, action) => {
      const newMix = { id: uuid(), channelId: uuid() }

      return loop({
        ...state,
        dirty: [...state.dirty, newMix.id]
      }, Effects.batch([
        Effects.constant(createChannel({
          id: newMix.channelId,
          type: CHANNEL_TYPE_MIX
        })),
        Effects.constant(createMeta({
          id: newMix.id,
          title: 'new mix title'
        })),
        Effects.constant(setMix(newMix)),
        Effects.constant(navigateToMix(newMix.id))
      ]))
    },
    [reorderPrimaryTrack]: (state, action) => {
      const { targetIndex, sourceIndex, tracks } = action.payload
      if (sourceIndex === targetIndex) { return state }

      assert(sourceIndex >= 0 && sourceIndex < tracks.length, 'Must provide valid sourceIndex')
      assert(targetIndex >= 0 && targetIndex < tracks.length, 'Must provide valid targetIndex')

      let effects = []

      // forwards swap
      if (sourceIndex < targetIndex) {
        for (let i = sourceIndex; i < targetIndex; i++) {
          // TODO: this does not work.
          // we need to get the result of previous swap in order to do the next swap
          // could do that by just passing IDs, and moving swapPrimaryTracks to channel reducer?
          effects.push(Effects.constant(swapPrimaryTracks({
            sourceTrack: tracks[i],
            targetTrack: tracks[i + 1]
          })))
        }

      // backwards swap
      } else {
        // TODO: implement this
        console.log('BACKWARDS SWAP not implemented')
      }

      return loop(state, Effects.batch(effects))
    },
    [swapPrimaryTracks]: (state, action) => {
      // TODO: update both channels, switch startBeats
      // TODO: also update both associate transitions to same endBeat as track
      // TODO: anything we need to do with track or transition length?

      const { sourceTrack, targetTrack } = action.payload
      if (sourceTrack.id === targetTrack.id) { return state }

      return loop(state, Effects.batch([
        Effects.constant(updateChannel({
          id: sourceTrack.id,
          startBeat: targetTrack.channel.startBeat
        })),
        Effects.constant(updateChannel({
          id: targetTrack.id,
          startBeat: sourceTrack.channel.startBeat
        }))
      ]))
    },
    [navigateToMix]: (state, action) => loop(state,
      Effects.constant(push(`/mixes/${action.payload}`))),
    [navigateToMixList]: (state, action) => loop(state,
      Effects.constant(push('/mixes/')))
  }, {
    isLoadingList: false,
    loading: [],
    saving: [],
    dirty: [],
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

  function runSaveMix (nestedMix) {
    return service.saveMix(pick(nestedMix, 'id', 'channel'))
      .then(() => saveMixSuccess(nestedMix))
      .catch(saveMixFailure)
  }

  function runDeleteMix (nestedMix) {
    return service.deleteMix(nestedMix)
      .then(() => deleteMixSuccess(nestedMix))
      .catch(deleteMixFailure)
  }
}
