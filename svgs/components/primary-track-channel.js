const React = require('react')
const { map } = require('lodash')

const SampleClip = require('./sample-clip')
const { CLIP_TYPE_SAMPLE } = require('../../clips/constants')

class PrimaryTrackChannel extends React.Component {
  render () {
    const { channel, color, beatScale, translateY, canDrag, moveClip } = this.props
    if (!channel) { return null }

    return <g transform={`translate(${channel.startBeat},${translateY})`}>
      {map(channel.clips, clip =>
        (clip.type === CLIP_TYPE_SAMPLE) && <SampleClip
          key={clip.id}
          clip={clip}
          beatScale={beatScale}
          color={color}
          canDrag={canDrag}
          moveClip={moveClip}
        />
      )}
    </g>
  }
}

PrimaryTrackChannel.defaultProps = {
  translateY: 0,
  canDrag: false
}

module.exports = PrimaryTrackChannel
