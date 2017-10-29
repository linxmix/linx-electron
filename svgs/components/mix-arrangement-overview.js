const React = require('react')
const { map, filter } = require('lodash')
const d3 = require('d3')

const MixArrangementLayout = require('./mix-arrangement-layout')
const TrackChannel = require('./track-channel')

class MixArrangementOverview extends React.Component {
  render () {
    const { mix, audioContext, height, seekToBeat, scaleX, translateX, updateZoom } = this.props
    if (!(mix && mix.channel)) { return null }

    const beatScale = mix.channel.beatScale

    return <MixArrangementLayout
      mix={mix}
      seekToBeat={seekToBeat}
      audioContext={audioContext}
      updateZoom={updateZoom}
      scaleX={scaleX}
      translateX={translateX}
      height={height}>

      {map(mix.trackGroups, (trackGroup, i, trackGroups) => <TrackChannel
        key={trackGroup.primaryTrack.id || trackGroup.id}
        channel={trackGroup.primaryTrack}
        beatScale={beatScale}
        scaleX={this.props.scaleX}
        sampleResolution={0.5}
        color={d3.interpolateCool(i / trackGroups.length)}
      />)}
    </MixArrangementLayout>
  }
}

MixArrangementOverview.defaultProps = {
  height: 100,
  scaleX: 1,
  translateX: 1
}

module.exports = MixArrangementOverview
