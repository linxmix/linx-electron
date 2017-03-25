const React = require('react')
const d3 = require('d3')
const { throttle } = require('lodash')

const MixArrangementLayout = require('./mix-arrangement-layout')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')
const DetectDragModifierKeys = require('../../lib/detect-drag-modifier-keys')
const { roundTo } = require('../../lib/number-utils')

class MixArrangementDetail extends React.Component {
  render () {
    const { mix, audioContext, height, rowHeight, seekToBeat, updateAudioGraph,
      fromTrack, toTrack, updateClip, updateChannel, scaleX, translateX, updateZoom } = this.props
    if (!(mix && mix.channel)) { return null }

    const { transition } = fromTrack
    const beatScale = mix.channel.beatScale

    console.log('mix-arrangement-detail', { fromTrack, toTrack, transition })

    const moveClip = ({ id, startBeat, diffX }) => updateClip({
      id,
      startBeat: _quantizeBeat(this.props.dragModifierKeys, (diffX / scaleX)) + startBeat
    })
    const moveChannel = ({ id, startBeat, diffX }) => updateChannel({
      id,
      startBeat: _quantizeBeat(this.props.dragModifierKeys, (diffX / scaleX)) + startBeat
    })
    const didUpdateArrangement = () => updateAudioGraph(mix.channel)

    return <MixArrangementLayout
      mix={mix}
      seekToBeat={seekToBeat}
      audioContext={audioContext}
      updateZoom={updateZoom}
      moveClip={moveClip}
      moveChannel={moveChannel}
      didUpdateArrangement={didUpdateArrangement}
      scaleX={scaleX}
      translateX={translateX}
      translateY={25}
      height={height}>

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

module.exports = DetectDragModifierKeys({ listenForAllDragEvents: true })(MixArrangementDetail)

function _quantizeBeat(dragModifierKeys, beat, timeSignature = 4) {
  console.log('_quantizeBeat', { dragModifierKeys, beat })

  // beat quantization
  if (dragModifierKeys.ctrlKey || dragModifierKeys.metaKey) {
    return Math.round(beat)

  // sample quantization
  } else if (dragModifierKeys.altKey) {
    return beat
  }

  // (default) bar quantization
  else {
    return roundTo(beat, timeSignature)
  }
}
