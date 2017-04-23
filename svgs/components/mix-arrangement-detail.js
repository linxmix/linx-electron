const React = require('react')
const d3 = require('d3')
const { pick, get, map } = require('lodash')

const MixArrangementLayout = require('./mix-arrangement-layout')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')
const TrackControl = require('./track-control')

class MixArrangementDetail extends React.Component {
  render () {
    const { mix, audioContext, height, rowHeight, fromTrack, toTrack, scaleX, translateX } = this.props
    if (!(mix && mix.channel)) { return null }

    const layoutActions = pick(this.props, ['updateZoom', 'moveClip', 'moveTransitionChannel',
      'movePrimaryTrackChannel', 'resizeChannel', 'updateAudioGraph', 'seekToBeat', 'moveControlPoint'])

    const primaryTrackChannelActions = {
      createControlPoint: ({ sourceId, e, minBeat, maxBeat }) => {
        const { beat, value } = _getPosition({ e, scaleX, rowHeight })
        this.props.createControlPoint({
          sourceId, beat, value, minBeat, maxBeat
        })

        // TODO: remove this hack
        // Make sure this.props.mix is updated from previous action
        window.setTimeout(() => this.props.updateAudioGraph({ channel: this.props.mix.channel }))
      },

      deleteControlPoint: (...args) => {
        this.props.deleteControlPoint(...args)

        // TODO: remove this hack
        // Make sure this.props.mix is updated from previous action
        window.setTimeout(() => this.props.updateAudioGraph({ channel: this.props.mix.channel }))
      },

      createAutomationClipWithControlPoint: ({ channelId, e, minBeat, maxBeat }) => {
        const { beat, value } = _getPosition({ e, scaleX, rowHeight })
        this.props.createAutomationClipWithControlPoint({
          channelId, beat, value, minBeat, maxBeat
        })

        // TODO: remove this hack
        // Make sure this.props.mix is updated from previous action
        window.setTimeout(() => this.props.updateAudioGraph({ channel: this.props.mix.channel }))
      },
    }

    const { transition } = fromTrack
    const beatScale = get(mix, 'channel.beatScale')
    const trackControls = map([fromTrack, toTrack], (track) =>
      <TrackControl
        key={track.id + '_control'}
        title={track.meta.title}
        bpm={track.meta.bpm}
      />
    )
    console.log('mix-arrangement-detail', { fromTrack, toTrack, transition })

    return <MixArrangementLayout
      mix={mix}
      audioContext={audioContext}
      scaleX={scaleX}
      translateX={translateX}
      height={height}
      trackControls={trackControls}
      {...layoutActions}>

      <PrimaryTrackChannel
        key={fromTrack.id + '_channel'}
        channel={fromTrack.channel}
        beatScale={beatScale}
        translateY={0}
        scaleX={scaleX}
        canDrag
        canDragTransition
        canDragAutomations
        showAutomations
        showTransition
        color={d3.interpolateCool(0.25)}
        {...primaryTrackChannelActions}
      />

      <PrimaryTrackChannel
        key={toTrack.id + '_channel'}
        channel={toTrack.channel}
        beatScale={beatScale}
        translateY={rowHeight}
        scaleX={scaleX}
        canDrag
        canDragAutomations
        showAutomations
        color={d3.interpolateCool(0.75)}
        {...primaryTrackChannelActions}
      />
    </MixArrangementLayout>
  }
}

MixArrangementDetail.defaultProps = {
  height: '100%',
  rowHeight: 100,
  scaleX: 1,
  translateX: 1
}

module.exports = MixArrangementDetail

function _getPosition({ e, scaleX, rowHeight }) {
  const dim = e.target.getBoundingClientRect()
  const x = e.clientX - dim.left
  const y = e.clientY - dim.top

  return {
    beat: (x / scaleX),
    value: 1 - (y / rowHeight),
  }
}
