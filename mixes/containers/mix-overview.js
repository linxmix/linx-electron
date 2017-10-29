const React = require('react')
const { connect } = require('react-redux')
const { forEach, get, map } = require('lodash')
const keymaster = require('keymaster')

const { getMixProps } = require('../getters')
const { saveMix, loadMix, deleteMix, unsetTrackGroupFromMix } = require('../actions')
const { updateMeta } = require('../../metas/actions')
const { playPause, seekToBeat } = require('../../audios/actions')
const { createTrackGroupFromFile, swapChannels } = require('../../channels/actions')
const { updateZoom } = require('../../svgs/actions')
const PrimaryTrackTable = require('../components/primary-track-table')
const MixArrangementOverview = require('../../svgs/components/mix-arrangement-overview')
const { PLAY_STATE_PLAYING } = require('../../audios/constants')

class MixOverviewContainer extends React.Component {
  componentDidMount () {
    keymaster('space', () => this.props.playPause({ channel: this.props.mix.channel }))

    const { loadMix, mix } = this.props
    if (mix && !get(mix, 'channel.type')) {
      loadMix(mix.id)
    }
  }

  componentWillUnmount () {
    keymaster.unbind('space')
  }

  handleFilesDrop ({ files }) {
    const { mix, createTrackGroupFromFile } = this.props
    const mixBeatCount = mix && mix.channel && mix.channel.beatCount
    const startBeat = Math.ceil(mixBeatCount ? mixBeatCount + 1 : 0)

    forEach(files, (file, i) => createTrackGroupFromFile({
      file,
      parentChannelId: mix.channel.id,
      attrs: {
        startBeat: startBeat + i
      }
    }))
  }

  handleChangeMixTitle (e) {
    const newTitle = e && e.target && e.target.value
    const { mix, updateMeta } = this.props
    updateMeta({ id: mix.id, title: newTitle })
  }

  render () {
    const { mix, audioContext, error, sampleError, saveMix, deleteMix, swapChannels,
      unsetTrackGroupFromMix, seekToBeat, updateZoom, zoom, playPause } = this.props
    if (!mix) { return null }
    console.log('mix', mix)

    const { playState, isSaving, isLoading, isDirty, channel } = mix
    const { status: masterChannelStatus } = channel

    let titleElement
    if (isLoading) {
      titleElement = <div>'{mix.meta.title}' is loading…</div>
    } else if (masterChannelStatus === 'loading') {
      titleElement = <div>loading audio…</div>
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
          disabled={masterChannelStatus !== 'loaded'}
          onClick={() => playPause({ channel })}>
          {playState.status === PLAY_STATE_PLAYING ? 'Pause Mix' : 'Play Mix'}
        </button>
      </header>

      <section className='VerticalLayout-flexSection u-scrollable'>
        <PrimaryTrackTable
          mixId={mix.id}
          trackGroups={mix.trackGroups}
          isLoading={isLoading}
          handleFilesDrop={this.handleFilesDrop.bind(this)}
          swapTrackGroups={swapChannels}
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
      router.setRouteLeaveHook(
        route,
        // TODO: do i need to back out all changes if confirm? how to do that cleanly - LOAD_MIX? ROLLBACK_MIX?
        () => !mix.isDirty ||
          window.confirm('You have unsaved changes that will be lost if you leave this page.')
      )
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
    unsetTrackGroupFromMix,
    seekToBeat,
    updateZoom,
    playPause
  }
)(MixOverviewContainer)
