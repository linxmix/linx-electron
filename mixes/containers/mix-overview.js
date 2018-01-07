const React = require('react')
const { connect } = require('react-redux')
const { assign, forEach, get, map } = require('lodash')
const keymaster = require('keymaster')

const { getMixProps } = require('../getters')
const { saveMix, loadMix, deleteMix, unsetTrackGroupFromMix } = require('../actions')
const { updateMeta } = require('../../metas/actions')
const { loadReverbSampleList } = require('../../samples/actions')
const { playPause, seekToBeat, startRecording, stopRecording } = require('../../audios/actions')
const { createTrackGroupFromFile, swapChannels } = require('../../channels/actions')
const { updateZoom } = require('../../svgs/actions')
const PrimaryTrackTable = require('../components/primary-track-table')
const MixArrangementOverview = require('../../svgs/components/mix-arrangement-overview')
const { quantizeBeat } = require('../../lib/number-utils')

class MixOverviewContainer extends React.Component {
  componentDidMount () {
    keymaster('space', () => this.props.playPause({
      channel: this.props.mix.channel,
      updateSeek: true
    }))

    // keymaster('⌘+s, ctrl+s', () => this.props.mix.isDirty && this.props.saveMix(this.props.mix))

    const { loadMix, mix, loadReverbSampleList } = this.props
    if (mix && !mix.channel.type) {
      loadMix(mix.id)
    }
    loadReverbSampleList()
  }

  componentWillUnmount () {
    keymaster.unbind('space')
    // keymaster.unbind('⌘+s, ctrl+s')
  }

  handleFilesDrop ({ files }) {
    const { mix, createTrackGroupFromFile } = this.props
    const maxBeat = mix && mix.channel && mix.channel.maxBeat
    const startBeat = Math.ceil(maxBeat ? maxBeat + 1 : 0)

    forEach(files, (file, i) => createTrackGroupFromFile({
      file,
      parentChannelId: mix.channel.id,
      attrs: {
        startBeat: quantizeBeat({ beat: startBeat + i, quantization: 'bar' })
      }
    }))
  }

  handleChangeMixTitle (e) {
    const newTitle = e && e.target && e.target.value
    const { mix, updateMeta } = this.props
    updateMeta({ id: mix.id, title: newTitle })
  }

  handleToggleRecording () {
    const { mix, playPause, startRecording, stopRecording } = this.props
    const { playState, channel } = mix

    if (playState && playState.isRecording) {
      stopRecording({ channel })

      if (playState.isPlaying) {
        window.setTimeout(() => playPause({ channel, updateSeek: true }))
      }
    } else {
      startRecording({ channel })

      if (!(playState && playState.isPlaying)) {
        window.setTimeout(() => playPause({ channel, updateSeek: true }))
      }

      const duration = mix.channel.beatScale(mix.channel.maxBeat)
      window.setTimeout(() => {
        this.handleToggleRecording()
      }, duration * 1000)
    }
  }

  render () {
    const { mix, audioContext, error, sampleError, saveMix, deleteMix, swapChannels,
      unsetTrackGroupFromMix, seekToBeat, updateZoom, zoom, playPause } = this.props
    if (!mix) { return null }
    console.log('mix', mix)

    const { playState, isSaving, isLoading, isDirty, channel } = mix

    let titleElement
    if (isLoading) {
      titleElement = <div>'{mix.meta.title}' is loading…</div>
    } else {
      titleElement = <input type='text'
        value={mix.meta.title}
        placeholder='Untitled Mix'
        onChange={this.handleChangeMixTitle.bind(this)} />
    }

    return <div className='VerticalLayout VerticalLayout--fullHeight'>
      <header className='VerticalLayout-fixedSection'>
        {titleElement}
        <div>{error || sampleError || 'no errors'}</div>
        <button disabled={!isDirty || (isLoading || isSaving)} onClick={() => saveMix(mix)}>
          Save Mix
        </button>
        <button disabled={isLoading || isSaving} onClick={() => deleteMix(mix.id)}>
          Delete Mix
        </button>
        <button
          disabled={isLoading || isSaving}
          onClick={() => playPause({ channel, updateSeek: true })}>
          {playState.isPlaying ? 'Pause Mix' : 'Play Mix'}
        </button>
        <button
          disabled={isLoading || isSaving}
          onClick={this.handleToggleRecording.bind(this)}>
          {playState.isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </header>

      <section className='VerticalLayout-flexSection u-scrollable'>
        <PrimaryTrackTable
          mixId={mix.id}
          trackGroups={mix.trackGroups}
          isLoading={isLoading}
          handleFilesDrop={this.handleFilesDrop.bind(this)}
          swapTrackGroups={props => swapChannels(assign({}, props, {
            parentId: mix.channel.id
          }))}
          removeTrackGroup={trackGroupId => unsetTrackGroupFromMix({
            trackGroupId,
            id: mix.id
          })}
        />
      </section>

      <section className='VerticalLayout-fixedSection'>
        <MixArrangementOverview
          mix={mix}
          updateZoom={updateZoom}
          audioContext={audioContext}
          scaleX={zoom.scaleX}
          translateX={zoom.translateX}
          seekToBeat={seekToBeat}
        />
      </section>
    </div>
  }
}

module.exports = connect(
  (state, ownProps) => {
    const props = getMixProps(state)
    const currentMixId = ownProps.params.mixId
    const { router, route } = ownProps
    const mix = props.mixes[currentMixId]

    const zoom = props.zooms[currentMixId] || {}

    if (mix) {
      // router.setRouteLeaveHook(
      //   route,
      //   // TODO: do i need to back out all changes if confirm? how to do that cleanly - LOAD_MIX? ROLLBACK_MIX?
      //   () => !mix.isDirty ||
      //     window.confirm('You have unsaved changes that will be lost if you leave this page.')
      // )
    }

    return { ...props, mix, zoom }
  },
  {
    saveMix,
    loadMix,
    deleteMix,
    updateMeta,
    createTrackGroupFromFile,
    swapChannels,
    loadReverbSampleList,
    unsetTrackGroupFromMix,
    seekToBeat,
    updateZoom,
    startRecording,
    stopRecording,
    playPause
  }
)(MixOverviewContainer)
