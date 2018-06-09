const React = require('react')
const { map, filter } = require('lodash')
const d3 = require('d3')

const MixArrangementLayout = require('./mix-arrangement-layout')
const TrackGroup = require('./track-group')

class MixArrangementOverview extends React.Component {
  render () {
    const { mix, audioContext, height, seekToBeat, scaleX, translateX, sampleResolution, updateZoom } = this.props
    if (!(mix && mix.channel)) { return null }

    const beatScale = mix.channel.beatScale

    return <MixArrangementLayout
      mix={mix}
      seekToBeat={seekToBeat}
      audioContext={audioContext}
      updateZoom={updateZoom}
      scaleX={scaleX}
      translateX={translateX}
      height={height}
    >

      {map(mix.trackGroups, (trackGroup, i, trackGroups) => <TrackGroup
        key={trackGroup.id}
        channel={trackGroup}
        beatScale={beatScale}
        translateY={0}
        scaleX={scaleX}
        rowHeight={height}
        collapseRows
        color={d3.interpolateCool(i / trackGroups.length)}
        sampleResolution={sampleResolution}
      />)}
    </MixArrangementLayout>
  }
}

MixArrangementOverview.defaultProps = {
  height: 100,
  scaleX: 1,
  translateX: 1,
  sampleResolution: 0.5
}

module.exports = MixArrangementOverview
