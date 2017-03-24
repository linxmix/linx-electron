const React = require('react')
const { map } = require('lodash')
const d3 = require('d3')

const MixArrangementLayout = require('./mix-arrangement-layout')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')
const {
  CHANNEL_TYPE_PRIMARY_TRACK,
  CHANNEL_TYPE_TRANSITION
} = require('../../channels/constants')

class MixArrangementOverview extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      scaleX: 1,
      translateX: 1
    }
  }

  render () {
    const { mix, audioContext, height, seekToBeat } = this.props
    if (!(mix && mix.channel)) { return null }

    const beatScale = mix.channel.beatScale
    const { scaleX, translateX } = this.state

    return <MixArrangementLayout
      mix={mix}
      seekToBeat={seekToBeat}
      audioContext={audioContext}
      updateZoom={({ translateX, scaleX }) => this.setState({ translateX, scaleX })}
      scaleX={scaleX}
      translateX={translateX}
      height={height}>

      {map(mix.channel.channels, (channel, i, channels) => {
        let Element
        switch (channel.type) {
          case CHANNEL_TYPE_PRIMARY_TRACK:
            Element = PrimaryTrackChannel; break
          case CHANNEL_TYPE_TRANSITION:
            Element = TransitionChannel; break
        }
        return Element ? <Element
          key={channel.id}
          beatScale={beatScale}
          channel={channel}
          color={d3.interpolateCool(i / channels.length)}
          /> : null
      })}
    </MixArrangementLayout>
  }
}

MixArrangementOverview.defaultProps = {
  height: 100
}

module.exports = MixArrangementOverview
