const React = require('react')
const { map } = require('lodash')
const SampleClip = require('./sample-clip')

const {
  CHANNEL_TYPE_PRIMARY_TRACK,
  CHANNEL_TYPE_TRANSITION
} = require('../../channels/constants')

// TODO: abstract identifiers
function isSampleClip(clip) {
  return clip && clip.sample
}

class PrimaryTrackChannel extends React.Component {
  render () {
    const { channel, xScale } = this.props
    if (!channel) { return null }

    const translateX = xScale * channel.startBeat
    const transform = `translate(${translateX})`

    return <g transform={transform}>
      {map(channel.clips, (clip) => 
        isSampleClip(clip) && <SampleClip key={clip.id} clip={clip} />
      )}
    </g>
  }
}

PrimaryTrackChannel.defaultProps = {
  xScale: 1
}

module.exports = PrimaryTrackChannel
