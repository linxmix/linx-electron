const React = require('react')
const d3 = require('d3')

const MixArrangementLayout = require('./mix-arrangement-layout')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')

class MixArrangementDetail extends React.Component {
  render () {
    const { mix, audioContext, height, rowHeight, seekToBeat,
      fromTrack, toTrack, updateClip, scaleX, translateX, updateZoom } = this.props
    if (!(mix && mix.channel)) { return null }

    const { transition } = fromTrack

    console.log('mix-arrangement-detail', { fromTrack, toTrack, transition })

    const beatScale = mix.channel.beatScale
    const moveClip = ({ id, startBeat, diffX }) => updateClip({
      id,
      startBeat: (diffX / scaleX) + startBeat
    })

    return <MixArrangementLayout
      mix={mix}
      seekToBeat={seekToBeat}
      audioContext={audioContext}
      updateZoom={updateZoom}
      scaleX={scaleX}
      translateX={translateX}
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
        canDrag={true}
        scaleX={scaleX}
        moveClip={moveClip}
        color={d3.interpolateCool(0.25)}
      />

      <PrimaryTrackChannel
        key={toTrack.id}
        channel={toTrack.channel}
        beatScale={beatScale}
        translateY={rowHeight}
        canDrag={true}
        scaleX={scaleX}
        moveClip={moveClip}
        color={d3.interpolateCool(0.75)}
      />
    </MixArrangementLayout>
  }
}

MixArrangementDetail.defaultProps = {
  height: 200,
  rowHeight: 100,
  scaleX: 1,
  translateX: 1
}

module.exports = MixArrangementDetail
