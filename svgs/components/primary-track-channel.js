const React = require('react')
const { map } = require('lodash')

const SampleClip = require('./sample-clip')

const {
  CHANNEL_TYPE_PRIMARY_TRACK,
  CHANNEL_TYPE_TRANSITION
} = require('../../channels/constants')

// TODO: abstract identifiers
function isSampleClip (clip) {
  return clip && clip.sample
}

class PrimaryTrackChannel extends React.Component {
  render () {
    const { channel, color } = this.props
    if (!channel) { return null }

    return <g transform={`translate(${channel.startBeat})`}>
      {map(channel.clips, clip =>
        isSampleClip(clip) && <SampleClip
          key={clip.id}
          clip={clip}
          color={color}
          />
      )}
    </g>
  }
}

module.exports = PrimaryTrackChannel
