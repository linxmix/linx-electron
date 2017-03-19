const React = require('react')
const d3 = require('d3')

const MixArrangementLayout = require('./mix-arrangement-layout')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')

class MixArrangementDetail extends React.Component {
  render () {
    const { mix, audioContext, height, rowHeight, seekToBeat,
      fromTrack, toTrack, moveClip } = this.props
    if (!(mix && mix.channel)) { return null }

    const { transition } = fromTrack

    console.log('mix-arrangement-detail', { fromTrack, toTrack, transition })

    const beatScale = mix.channel.beatScale

    return <MixArrangementLayout
      mix={mix}
      seekToBeat={seekToBeat}
      audioContext={audioContext}
      height={height}>

      <TransitionChannel
        key={transition.id}
        channel={transition}
      />

      <PrimaryTrackChannel
        key={fromTrack.id}
        channel={fromTrack.channel}
        beatScale={beatScale}
        translateY={0}
        canDrag
        moveClip={moveClip}
        color={d3.interpolateCool(0.25)}
      />

      <PrimaryTrackChannel
        key={toTrack.id}
        channel={toTrack.channel}
        beatScale={beatScale}
        translateY={rowHeight}
        canDrag
        moveClip={moveClip}
        color={d3.interpolateCool(0.75)}
      />
    </MixArrangementLayout>
  }
}

MixArrangementDetail.defaultProps = {
  height: 200,
  rowHeight: 100
}

module.exports = MixArrangementDetail
