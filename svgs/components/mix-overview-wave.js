const React = require('react')
const { map } = require('lodash')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')

const {
  CHANNEL_TYPE_PRIMARY_TRACK,
  CHANNEL_TYPE_TRANSITION
} = require('../../channels/constants')

class MixOverviewWave extends React.Component {
  render () {
    const {
      mix
    } = this.props

    return <svg width='100%' height={100} style={{ border: '1px solid gray' }}>
      {map(mix.channel.channels, (channel) => {
        switch(channel.type) {
          case CHANNEL_TYPE_PRIMARY_TRACK:
            return <PrimaryTrackChannel key={channel.id} channel={channel} />
          case CHANNEL_TYPE_TRANSITION:
            return <TransitionChannel key={channel.id} channel={channel} />
          default:
            return null
        }
      })}
    </svg>
  }
}

module.exports = MixOverviewWave
