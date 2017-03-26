const React = require('react')
const { map } = require('lodash')

const SampleClip = require('./sample-clip')
const { CLIP_TYPE_SAMPLE } = require('../../clips/constants')

class PrimaryTrackChannel extends React.Component {
  render () {
    const { channel, color, beatScale, translateY, canDrag, height } = this.props
    if (!channel) { return null }

    return <g transform={`translate(${channel.startBeat},${translateY})`}>
      {map(channel.clips, clip =>
        (clip.type === CLIP_TYPE_SAMPLE) && <SampleClip
          key={clip.id}
          clip={clip}
          beatScale={beatScale}
          color={color}
          height={height}
          canDrag={canDrag}
        />
      )}
    </g>
  }
}

PrimaryTrackChannel.defaultProps = {
  translateY: 0,
  canDrag: false,
  height: 100
}

module.exports = PrimaryTrackChannel
