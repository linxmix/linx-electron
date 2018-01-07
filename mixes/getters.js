const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { find, filter, includes, map, mapValues, sortBy, values } = require('lodash')

const { getPlayStates, getAudioContext } = require('../audios/getters')
const { getMetas } = require('../metas/getters')
const { getChannels } = require('../channels/getters')
const {
  getReverbSamples,
  getSamplesError,
  getIsLoadingReverbSampleList
} = require('../samples/getters')
const { getZooms } = require('../svgs/getters')
const { CHANNEL_TYPE_TRACK_GROUP } = require('../channels/constants')
const { CLIP_TYPE_TEMPO } = require('../clips/constants')

const getMixesRecords = (state) => state.mixes.records
const getMixesIsLoadingList = (state) => state.mixes.isLoadingList
const getMixesSaving = (state) => state.mixes.saving
const getMixesLoading = (state) => state.mixes.loading
const getMixesDirty = (state) => state.mixes.dirty
const getMixesError = (state) => state.mixes.error

const getMixes = Getter(
  getMixesRecords,
  getPlayStates,
  getMetas,
  getChannels,
  getMixesSaving,
  getMixesLoading,
  getMixesDirty,
  getIsLoadingReverbSampleList,
  (mixes, playStates, metas, channels, saving, loading, dirtyMixes, isLoadingReverbSampleList) => {
    return mapValues(mixes, ({ id, channelId }) => {
      const meta = metas[id] || {}
      const channel = channels[channelId] || {}
      const playState = playStates[channel.id] || {}

      return {
        id,
        channel,
        meta,
        playState,
        tempoClip: find(channel.clips || [], { type: CLIP_TYPE_TEMPO }) || {},
        trackGroups: map(
          filter(channel.channels || [], { type: CHANNEL_TYPE_TRACK_GROUP }),
          (trackGroup, i) => ({
            channel: trackGroup,
            index: i,
            ...trackGroup
          })
        ),
        isLoading: includes(loading, id) || isLoadingReverbSampleList || (channel.status !== 'loaded'),
        isSaving: includes(saving, id),
        isDirty: includes(dirtyMixes, id) ||
          meta.isDirty ||
          channel.isDirty
      }
    })
  }
)

const getMixList = Getter(
  getMixes,
  (mixes) => sortBy(values(mixes), 'meta.title')
)

const getMixListProps = Struct({
  mixList: getMixList,
  isLoadingList: getMixesIsLoadingList,
  error: getMixesError
})

const getMixProps = Struct({
  mixes: getMixes,
  zooms: getZooms,
  reverbSamples: getReverbSamples,
  isLoadingReverbSampleList: getIsLoadingReverbSampleList,
  sampleError: getSamplesError,
  error: getMixesError,
  audioContext: getAudioContext
})

module.exports = {
  getMixListProps,
  getMixProps
}
