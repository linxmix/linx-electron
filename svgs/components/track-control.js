const React = require('react')
const { DragSource } = require('react-dnd')
const uuid = require('uuid/v4')
const { map } = require('lodash')

const { isValidNumber } = require('../../lib/number-utils')

const DELAY_TIMES = [
  {
    label: '4 / 4',
    value: 1
  },
  {
    label: '3 / 8',
    value: 3.0 / 8.0
  },
  {
    label: '1 / 4',
    value: 1.0 / 4.0
  },
  {
    label: '3 / 16',
    value: 3.0 / 16.0
  },
  {
    label: '1 / 8',
    value: 1.0 / 8.0
  },
  {
    label: '1 / 16',
    value: 1.0 / 16.0
  },
  {
    label: '1 / 32',
    value: 1.0 / 32.0
  },
]

// TODO: does this really belong under svgs/? its not an svg
class TrackControl extends React.Component {
  handleChangePitchSemitones (e) {
    const newValue = parseFloat(e.target.value)

    if (isValidNumber(newValue) && (newValue !== this.props.pitchSemitones)) {
      this.props.updatePitchSemitones(newValue)
    }

    this.pitchSemitonesInputElement.blur()
  }

  handleChangeGain (e) {
    const newValue = parseFloat(e.target.value)

    if (isValidNumber(newValue) && (newValue !== this.props.gain)) {
      this.props.updateGain(newValue)
    }
  }

  onGainInputMouseLeave (e) {
    this.gainInputElement.blur()
  }

  handleChangeBpm (e) {
    const newValue = parseFloat(e.target.value)

    if (isValidNumber(newValue) && (newValue !== this.props.bpm)) {
      this.props.updateBpm(newValue)
    }
  }

  onBpmInputMouseLeave (e) {
    this.bpmInputElement.blur()
  }

  handleToggleEditBeatgrid (e) {
    this.props.toggleEditBeatgrid()
    this.editBeatgridInputElement.blur()
  }

  handleToggleSoloTrack (e) {
    this.props.toggleSoloTrack()
    this.soloTrackInputElement.blur()
  }

  handleSelectDelayTime(e) {
    const newValue = parseFloat(e.target.value)

    if (isValidNumber(newValue) && (newValue !== this.props.delayTime)) {
      this.props.selectDelayTime(newValue)
    }

    this.selectDelayTimeElement.blur()
  }

  render () {
    const { title, bpm, gain, musicalKey, delayTime, height, width, isEditingBeatgrid, pitchSemitones,
      toggleEditBeatgrid, toggleSoloTrack, isSoloTrack, canDeleteTrack } = this.props
    const bpmInputId = uuid()
    const editBeatgridInputId = uuid()
    const musicalKeyInputId = uuid()
    const gainInputId = uuid()
    const soloInputId = uuid()

    return <div className="TrackControl" style={{ height, width }}>
      <span className="u-multiline-ellipsis-1" title={title}>{title}</span>

      <div>
        <span onMouseLeave={this.onBpmInputMouseLeave.bind(this)}>
          <input id={bpmInputId}
            type='number'
            value={bpm}
            onChange={this.handleChangeBpm.bind(this)}
            min={0}
            max={200}
            step={1}
            ref={(element) => { this.bpmInputElement = element }}
          />
          <label htmlFor={bpmInputId}>BPM</label>
        </span>

        {canDeleteTrack && <button onClick={() => this.props.deleteTrack()}>
          x
        </button>}
      </div>

      <div>
        <input id={musicalKeyInputId}
          type='number'
          value={pitchSemitones}
          onChange={this.handleChangePitchSemitones.bind(this)}
          min={-12}
          max={12}
          step={1}
          ref={(element) => { this.pitchSemitonesInputElement = element }}
        />
        <label htmlFor={musicalKeyInputId}>Key: {musicalKey} </label>
      </div>

      <div>
        <span onMouseLeave={this.onGainInputMouseLeave.bind(this)} style={{ marginRight: '5px' }}>
          <input id={gainInputId}
            type='number'
            value={gain}
            onChange={this.handleChangeGain.bind(this)}
            min={0}
            max={3}
            step={0.1}
            ref={(element) => { this.gainInputElement = element }}
          />
          <label htmlFor={gainInputId}>Gain</label>
        </span>

        <span>
          <select
            value={delayTime}
            onChange={this.handleSelectDelayTime.bind(this)}
            ref={(element) => { this.selectDelayTimeElement = element }}>
            {map(DELAY_TIMES, ({ label, value }) =>
              <option key={label} value={value}>{label}</option>)}
          </select>
          Delay
        </span>
      </div>

      <div style={{ cursor: 'pointer' }}>
        <span style={{ marginRight: '5px' }}>
          <input id={editBeatgridInputId}
            ref={(element) => { this.editBeatgridInputElement = element }}
            type='checkbox' checked={isEditingBeatgrid} onChange={this.handleToggleEditBeatgrid.bind(this)} />
          <label htmlFor={editBeatgridInputId}>Beatgrid</label>
        </span>

        <span>
          <input id={soloInputId}
            ref={(element) => { this.soloTrackInputElement = element }}
            type='checkbox' checked={isSoloTrack} onChange={this.handleToggleSoloTrack.bind(this)} />
          <label htmlFor={soloInputId}>Solo</label>
        </span>

        {this.props.canDuplicateTrack && 
          <span style={{ marginLeft: '5px' }}>
            <button onClick={this.props.duplicateTrack}>Duplicate</button>
          </span>
        }
      </div>
    </div>
  }
}

TrackControl.defaultProps = {
  height: 100,
  width: '100%',
  isEditingBeatgrid: false,
  isSoloTrack: false,
  canDeleteTrack: false,
  canDuplicateTrack: false,
  musicalKey: '',
  pitchSemitones: 0,
  title: '',
  bpm: 0,
  gain: 1
}

module.exports = TrackControl
