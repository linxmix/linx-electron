const React = require('react')
const { map, filter } = require('lodash')
const d3 = require('d3')

const MixArrangementLayout = require('./mix-arrangement-layout')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')
const {
  CHANNEL_TYPE_PRIMARY_TRACK
} = require('../../channels/constants')

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

      {map(filter(mix.channel.channels, { type: CHANNEL_TYPE_PRIMARY_TRACK }),
        (channel, i, channels) => <PrimaryTrackChannel
          key={channel.id}
          beatScale={beatScale}
          channel={channel}
          sampleResolution={0.5}
          color={d3.interpolateCool(i / channels.length)}
        />
      )}
    </MixArrangementLayout>
  }
}

MixArrangementOverview.defaultProps = {
  height: 100,
  scaleX: 1,
  translateX: 1
}

module.exports = MixArrangementOverview
