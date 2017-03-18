const React = require('react')
const { map } = require('lodash')
const d3 = require('d3')

const MixArrangementLayout = require('./mix-arrangement-layout')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')

class MixArrangementDetail extends React.Component {
  render () {
    const { mix, audioContext, height, rowHeight, seekToBeat,
      fromTrack, toTrack } = this.props
    if (!(mix && mix.channel)) { return null }

    const { transition } = fromTrack

    console.log('mix-arrangement-detail', { fromTrack, toTrack, transition })

    const beatScale = mix.channel.beatScale

    return <MixArrangementLayout
      mix={mix}
      seekToBeat={seekToBeat}
      audioContext={audioContext}
      height={height}>

      <PrimaryTrackChannel
        key={fromTrack.id}
        channel={fromTrack.channel}
        beatScale={beatScale}
        translateY={0}
        color={d3.interpolateCool(.25)}
      />

      <PrimaryTrackChannel
        key={toTrack.id}
        channel={toTrack.channel}
        beatScale={beatScale}
        translateY={rowHeight}
        color={d3.interpolateCool(.75)}
      />
    </MixArrangementLayout>
  }
}

MixArrangementDetail.defaultProps = {
  height: 200,
  rowHeight: 100
}

module.exports = MixArrangementDetail
