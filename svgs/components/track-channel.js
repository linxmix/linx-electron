const React = require('react')
const { get, map, find, assign, filter, includes, omit, isEqual } = require('lodash')
const classnames = require('classnames')

const ResizeHandle = require('./resize-handle')
const SampleClip = require('./sample-clip')
const AutomationClip = require('./automation-clip')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_AUTOMATION } = require('../../clips/constants')
const { isRightClick, getPosition } = require('../../lib/mouse-event-utils')

class TrackChannel extends React.Component {
  shouldComponentUpdate(nextProps) {
    const ignoreKeys = ['channel.parentChannel.channels', 'channel.parentChannels.primaryTrack']
    return !isEqual(omit(nextProps, ...ignoreKeys), omit(this.props, ...ignoreKeys))
  }

  handleClick (e) {
    const { canEditAutomations, showAutomationControlType, canEditClips, channel } = this.props

    if (isRightClick(e) && (canEditAutomations || canEditClips)) {
      e.preventDefault()
      e.stopPropagation()

      let { beat, value } = getPosition({
        e,
        target: this.clipsGroupElement,
        scaleX: this.props.scaleX,
        height: this.props.height
      })

      // undo clipsGroup target offset which comes from clickBoxTranslateX
      beat += this.props.clickBoxTranslateX

      // adjust for channel startBeat
      beat -= channel.startBeat

      if (canEditAutomations) {
        const automationClip = find(channel.clips, { controlType: showAutomationControlType })

        if (automationClip) {
          this.props.createControlPoint({
            sourceId: automationClip.id,
            minBeat: channel.minBeat,
            maxBeat: channel.maxBeat,
            beat,
            value
          })
        } else {
          this.props.createAutomationClipWithControlPoint({
            channelId: channel.id,
            minBeat: channel.minBeat,
            maxBeat: channel.maxBeat,
            beat,
            value
          })
        }

      } else if (canEditClips) {
        const selectedClip = this.props.selectedClip

        // copy from selected clip if we have one
        let sourceClipStartBeat, clipOptions = { audioStartTime: channel.sample.meta.barGridTime }
        if (selectedClip) {
          clipOptions = {
            beatCount: selectedClip.beatCount,
            audioStartTime: selectedClip.audioStartTime
          }

          sourceClipStartBeat = selectedClip.startBeat
        }

        this.props.createSampleClip({
          clipOptions,
          sourceClipStartBeat,
          beat,
          channelId: channel.id,
          sampleId: channel.sampleId,
        })
      }
    }
  }

  render () {
    const { channel, color, beatScale, translateY, scaleX, sampleResolution, height, canEditAutomations, selectedControlPoint, isPrimaryTrack,
      canEditClips, canDragClips, canResizeClips, showAutomationControlType, showGridMarkers
    } = this.props
    if (!channel) { return null }

    const selectedClipId = get(this.props.selectedClip, 'id')
    const onResizeArgs = {
      isTrackChannel: true,
    }

    return <g className="TrackChannel"
      transform={`translate(0,${translateY})`}
      onMouseUp={this.handleClick.bind(this)}>
      {(showAutomationControlType || canEditClips) &&
        <rect transform={`translate(${this.props.clickBoxTranslateX},0)`}
          height={height}
          width={this.props.clickBoxWidth}
          fill="transparent"
          ref={(element) => { this.clipsGroupElement = element }}
        />
      }

      <g transform={`translate(${channel.startBeat},0)`}>
        {map(filter(channel.clips, { type: CLIP_TYPE_SAMPLE }), clip =>
          <SampleClip
            key={clip.id}
            clip={clip}
            channel={channel}
            scaleX={scaleX}
            beatScale={beatScale}
            color={color}
            sampleResolution={sampleResolution}
            height={height}
            gain={channel.gain}
            canDrag={canDragClips}
            canResize={canResizeClips}
            canEdit={canEditClips}
            isSelected={selectedClipId && selectedClipId === clip.id}
            snipClip={options =>
              this.props.snipClip(assign({ channel }, options))}
            deleteClip={options =>
              this.props.deleteClip(assign({ channel }, options))}
            selectClip={options =>
              this.props.selectClip(assign({ channel }, options))}
            showGridMarkers={showGridMarkers}
            selectGridMarker={options =>
              this.props.selectGridMarker(assign({ channel }, options))}
          />
        )}

        <g className={classnames('AutomationClipGroup', {
          'is-editable': canEditAutomations
          })}>
          {map(filter(channel.clips, {
            type: CLIP_TYPE_AUTOMATION,
            controlType: showAutomationControlType
          }), clip =>
            <AutomationClip
              key={clip.id}
              clip={clip}
              scaleX={scaleX}
              minBeat={channel.minBeat}
              maxBeat={channel.maxBeat}
              selectedControlPoint={selectedControlPoint}
              deleteControlPoint={this.props.deleteControlPoint}
              selectControlPoint={controlPoint => this.props.selectAutomation({
                channel,
                clip,
                controlPoint
              })}
              beatScale={beatScale}
              height={height}
              canEdit={canEditAutomations}
            />
          )}
        </g>
      </g>

      {this.props.canResizeChannel && <g>
        <ResizeHandle
          id={channel.id}
          height={height / 2.0}
          width={5.0 / scaleX}
          scaleX={scaleX}
          translateX={channel.minBeat}
          startBeat={channel.startBeat}
          beatCount={channel.beatCount}
          canDrag={this.props.canResizeChannel}
          isLeftHandle={true}
          onResizeArgs={onResizeArgs}
          fill='rgba(255,0,0,0.5)'
        />

        <ResizeHandle
          id={channel.id}
          height={height / 2.0}
          width={5.0 / scaleX}
          scaleX={scaleX}
          translateX={channel.startBeat}
          startBeat={channel.startBeat}
          beatCount={channel.beatCount}
          canDrag={this.props.canResizeChannel}
          onResizeArgs={onResizeArgs}
          fill='rgba(0,0,255,0.5)'
        />

        <ResizeHandle
          id={channel.id}
          height={height / 2.0}
          width={5.0 / scaleX}
          scaleX={scaleX}
          translateX={channel.maxBeat}
          startBeat={channel.startBeat}
          beatCount={channel.beatCount}
          canDrag={this.props.canResizeChannel}
          onResizeArgs={onResizeArgs}
          fill='rgba(255,0,0,0.5)'
        />
      </g>}
    </g>
  }
}

TrackChannel.defaultProps = {
  isPrimaryTrack: false,
  channel: null,
  beatScale: null,
  selectedClip: null,
  selectedControlPoint: null,
  clickBoxTranslateX: 0,
  clickBoxWidth: 0,
  translateY: 0,
  scaleX: 1,
  height: 100,
  color: 'green',
  canDragClips: false,
  canResizeClips: false,
  canResizeChannel: false,
  canEditClips: false,
  showAutomationControlType: undefined,
  canEditAutomations: false,
  showGridMarkers: true
}

module.exports = TrackChannel
