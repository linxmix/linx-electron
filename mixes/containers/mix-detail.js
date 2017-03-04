const React = require('react')
const { connect } = require('react-redux')
const { Link } = require('react-router')
const { forEach, last, get, findIndex } = require('lodash')

const { getMixProps } = require('../getters')
const { saveMix, loadMix } = require('../actions')
const { updateMeta } = require('../../metas/actions')
const { play, pause } = require('../../audio/actions')
const { createPrimaryTrackFromFile } = require('../../channels/actions')
const { isValidNumber } = require('../../lib/number-utils')
const PrimaryTrackTable = require('../components/primary-track-table')
const MixDetailArrangement = require('../../svgs/components/mix-detail-arrangement')
const { PLAY_STATE_PLAYING } = require('../../audio/constants')

class MixDetailContainer extends React.Component {
  render () {
    const { mix, fromTrack, toTrack, error, sampleError, saveMix, play, pause } = this.props
    if (!mix) { return null }
    console.log('mix detail', { mix, fromTrack, toTrack })

    const { playState, isSaving, isLoading, isDirty } = mix
    const { status: masterChannelStatus } = mix.channel

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
      <header style={{ border: '1px solid gray' }}>
        <h3>
          {fromTrack && fromTrack.meta.title} - {toTrack && toTrack.meta.title}
        </h3>
        <Link to={`/mixes/${mix.id}`}>
          Back to Mix
        </Link>
        <div>{error || sampleError || 'no errors'}</div>
        <button disabled={!isDirty || (isLoading || isSaving)} onClick={() => saveMix(mix)}>
          Save Mix
        </button>
        {playButton}
      </header>

      <section>
        <MixDetailArrangement
          mix={mix}
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
    const { router, route } = ownProps
    const props = getMixProps(state)

    const currentMixId = ownProps.params.mixId
    const mix = props.mixes[currentMixId]
    const currentTrackId = ownProps.params.trackId
    const currentTrackIndex = findIndex(mix.tracks, { id: currentTrackId })
    const fromTrack = mix.tracks[currentTrackIndex]
    const toTrack = mix.tracks[currentTrackIndex + 1]

    return { ...props, mix, fromTrack, toTrack }
  },
  {
    saveMix,
    loadMix,
    updateMeta,
    play,
    pause
  }
)(MixDetailContainer)
