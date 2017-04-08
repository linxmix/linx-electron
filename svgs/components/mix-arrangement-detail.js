const React = require('react')
const d3 = require('d3')
const { pick, get } = require('lodash')

const MixArrangementLayout = require('./mix-arrangement-layout')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')

class MixArrangementDetail extends React.Component {
  render () {
    const { mix, audioContext, height, rowHeight, fromTrack, toTrack, scaleX, translateX } = this.props
    if (!(mix && mix.channel)) { return null }

    const layoutActions = pick(this.props, ['updateZoom', 'moveClip', 'moveTransitionChannel',
      'movePrimaryTrackChannel', 'resizeChannel', 'updateAudioGraph', 'seekToBeat', 'moveControlPoint'])

    const createControlPoint = ({ sourceId, e, minBeat, maxBeat }) => {
      const dim = e.target.getBoundingClientRect()
      const x = e.clientX - dim.left
      const y = e.clientY - dim.top

      this.props.createControlPoint({
        sourceId,
        beat: (x / scaleX),
        value: 1 - (y / rowHeight),
        minBeat,
        maxBeat
      })
      this.props.updateAudioGraph({ channel: mix.channel })
    }

    const deleteControlPoint = (...args) => {
      this.props.deleteControlPoint(...args)
      this.props.updateAudioGraph({ channel: mix.channel })
    }

    const { transition } = fromTrack
    const beatScale = get(mix, 'channel.beatScale')

    console.log('mix-arrangement-detail', { fromTrack, toTrack, transition })

    return <MixArrangementLayout
      mix={mix}
      audioContext={audioContext}
      scaleX={scaleX}
      translateX={translateX}
      height={height}
      {...layoutActions}>

      <PrimaryTrackChannel
        key={fromTrack.id}
        channel={fromTrack.channel}
        beatScale={beatScale}
        translateY={0}
        createControlPoint={createControlPoint}
        deleteControlPoint={deleteControlPoint}
        canDrag
        canDragTransition
        canDragAutomations
        showAutomations
        showTransition
        color={d3.interpolateCool(0.25)}
      />

      <PrimaryTrackChannel
        key={toTrack.id}
        channel={toTrack.channel}
        beatScale={beatScale}
        translateY={rowHeight}
        createControlPoint={createControlPoint}
        deleteControlPoint={deleteControlPoint}
        canDrag
        canDragAutomations
        showAutomations
        color={d3.interpolateCool(0.75)}
      />
    </MixArrangementLayout>
  }
}

MixArrangementDetail.defaultProps = {
  height: 225,
  rowHeight: 100,
  scaleX: 1,
  translateX: 1
}

module.exports = MixArrangementDetail
