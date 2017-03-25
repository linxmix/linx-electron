const React = require('react')
const d3 = require('d3')
const { pick, get } = require('lodash')

const MixArrangementLayout = require('./mix-arrangement-layout')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')
const { roundTo } = require('../../lib/number-utils')

class MixArrangementDetail extends React.Component {
  render () {
    const { mix, audioContext, height, rowHeight, fromTrack, toTrack, scaleX, translateX } = this.props
    if (!(mix && mix.channel)) { return null }

    const layoutActions = pick(this.props, ['updateZoom', 'moveClip', 'moveChannel', 'resizeChannel',
      'updateAudioGraph', 'seekToBeat'])

    const { transition } = fromTrack
    const beatScale = get(mix, 'channel.beatScale')

    console.log('mix-arrangement-detail', { fromTrack, toTrack, transition })

    return <MixArrangementLayout
      mix={mix}
      audioContext={audioContext}
      scaleX={scaleX}
      translateX={translateX}
      translateY={25}
      height={height}
      {...layoutActions}>

      <PrimaryTrackChannel
        key={fromTrack.id}
        channel={fromTrack.channel}
        beatScale={beatScale}
        translateY={0}
        canDrag={true}
        color={d3.interpolateCool(0.25)}
      />

      <PrimaryTrackChannel
        key={toTrack.id}
        channel={toTrack.channel}
        beatScale={beatScale}
        translateY={rowHeight}
        canDrag={true}
        color={d3.interpolateCool(0.75)}
      />

      <TransitionChannel
        key={transition.id}
        channel={transition}
        height={height}
        canDrag={true}
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
