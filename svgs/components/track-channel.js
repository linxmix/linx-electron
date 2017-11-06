const React = require('react')
const { map, merge, filter } = require('lodash')

const SampleClip = require('./sample-clip')
const AutomationClip = require('./automation-clip')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_AUTOMATION } = require('../../clips/constants')
const { isRightClick } = require('../../lib/mouse-event-utils')

class TrackChannel extends React.Component {
  handleClick (e) {
    if (isRightClick(e)
      && this.props.showAutomationControlType) {
      e.preventDefault()
      e.stopPropagation()

      const { channel, createAutomationClipWithControlPoint } = this.props
      createAutomationClipWithControlPoint({
        channel,
        e,
        minBeat: channel.startBeat,
        maxBeat: channel.beatCount
      })
    }
  }

  render () {
    const { channel, color, beatScale, translateY, scaleX, sampleResolution, height,
      canDragClips, canResizeClips, showAutomationControlType, showGridMarkers } = this.props
    if (!channel) { return null }

    return <g
      onMouseUp={this.handleClick.bind(this)}
      transform={`translate(${channel.startBeat},${translateY})`}>
      {map(filter(channel.clips, { type: CLIP_TYPE_SAMPLE }), clip =>
        <SampleClip
          key={clip.id}
          clip={clip}
          scaleX={scaleX}
          beatScale={beatScale}
          color={color}
          sampleResolution={sampleResolution}
          height={height}
          canDrag={canDragClips}
          canResize={canResizeClips}
          showGridMarkers={showGridMarkers}
          selectGridMarker={options =>
            this.props.selectGridMarker(merge({ channel }, options))}
        />
      )}

      {showAutomationControlType && map(filter(channel.clips, {
        type: CLIP_TYPE_AUTOMATION,
        controlType: showAutomationControlType
      }), clip =>
        <AutomationClip
          key={clip.id}
          clip={clip}
          scaleX={scaleX}
          minBeat={channel.startBeat}
          maxBeat={channel.beatCount}
          createControlPoint={this.props.createControlPoint}
          deleteControlPoint={this.props.deleteControlPoint}
          beatScale={beatScale}
          height={height}
          canDrag
        />
      )}
    </g>
  }
}

TrackChannel.defaultProps = {
  channel: null,
  beatScale: null,
  translateY: 0,
  scaleX: 1,
  height: 100,
  color: 'green',
  canDragClips: false,
  canResizeClips: false,
  showAutomationControlType: undefined,
  showGridMarkers: true
}

module.exports = TrackChannel
