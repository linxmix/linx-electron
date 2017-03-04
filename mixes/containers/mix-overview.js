const React = require('react')
const { connect } = require('react-redux')
const { forEach, last, get } = require('lodash')

const { getMixProps } = require('../getters')
const { saveMix, loadMix, deleteMix,
  reorderPrimaryTrack, unsetPrimaryTrackFromMix } = require('../actions')
const { updateMeta } = require('../../metas/actions')
const { play, pause } = require('../../audio/actions')
const { createPrimaryTrackFromFile } = require('../../channels/actions')
const { validNumberOrDefault } = require('../../lib/number-utils')
const PrimaryTrackTable = require('../components/primary-track-table')
const MixOverviewArrangement = require('../../svgs/components/mix-overview-arrangement')
const { PLAY_STATE_PLAYING } = require('../../audio/constants')
const { seekToBeat } = require('../../audio/actions')

class MixOverviewContainer extends React.Component {
  handleFilesDrop ({ files }) {
    const { mix, createPrimaryTrackFromFile } = this.props
    const mixBeatCount = mix && mix.channel && mix.channel.beatCount
    const startBeat = validNumberOrDefault(mixBeatCount + 1, 0)

    forEach(files, (file, i) => createPrimaryTrackFromFile({
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
    const { mix, audioContext, error, sampleError, saveMix, deleteMix, reorderPrimaryTrack,
      unsetPrimaryTrackFromMix, seekToBeat, play, pause } = this.props
    if (!mix) { return null }
    console.log('mix', mix)

    const { playState, isSaving, isLoading, isDirty } = mix
    const { status: masterChannelStatus } = mix.channel

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

    let playButton
    if (playState.status !== PLAY_STATE_PLAYING) {
      playButton = <button
        disabled={masterChannelStatus !== 'loaded'}
        onClick={() => (mix && play({ channel: mix.channel }))}>
        Play Mix
      </button>
    } else {
      playButton = <button
        disabled={masterChannelStatus !== 'loaded'}
        onClick={() => (mix && pause({ channel: mix.channel }))}>
        Pause Mix
      </button>
    }

    return <div>
      <header>
        {titleElement}
        <div>{error || sampleError || 'no errors'}</div>
        <button disabled={!isDirty || (isLoading || isSaving)} onClick={() => saveMix(mix)}>
          Save Mix
        </button>
        <button disabled={isLoading || isSaving} onClick={() => deleteMix(mix.id)}>
          Delete Mix
        </button>
        {playButton}
      </header>

      <section>
        <PrimaryTrackTable
          mixId={mix.id}
          tracks={mix.tracks}
          reorderPrimaryTrack={reorderPrimaryTrack}
          isLoading={isLoading}
          handleFilesDrop={this.handleFilesDrop.bind(this)}
          removeTrack={primaryTrackId => unsetPrimaryTrackFromMix({
            id: mix.id, primaryTrackId })}
        />
      </section>

      <section>
        <MixOverviewArrangement
          mix={mix}
          audioContext={audioContext}
          seekToBeat={seekToBeat}
        />
      </section>
    </div>
  }

  componentDidMount () {
    const { loadMix, mix } = this.props

    if (mix && !mix.channel.type) {
      loadMix(mix.id)
    }
  }
}

module.exports = connect(
  (state, ownProps) => {
    const props = getMixProps(state)
    const currentMixId = ownProps.params.mixId
    const { router, route } = ownProps
    const mix = props.mixes[currentMixId]

    if (mix) {
      router.setRouteLeaveHook(
        route,
        // TODO: do i need to back out all changes if confirm? how to do that cleanly - LOAD_MIX? ROLLBACK_MIX?
        () => !mix.isDirty ||
          window.confirm('You have unsaved changes that will be lost if you leave this page.')
      )
    }

    return { ...props, mix }
  },
  {
    saveMix,
    loadMix,
    deleteMix,
    updateMeta,
    createPrimaryTrackFromFile,
    reorderPrimaryTrack,
    unsetPrimaryTrackFromMix,
    seekToBeat,
    play,
    pause
  }
)(MixOverviewContainer)