const React = require('react')
const { DragSource } = require('react-dnd')
const uuid = require('uuid/v4')

const { isValidNumber } = require('../../lib/number-utils')

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

  onGainInputMouseUp (e) {
    this.gainInputElement.blur()
  }

  handleToggleEditBeatgrid (e) {
    this.props.toggleEditBeatgrid()
    this.editBeatgridInputElement.blur()
  }

  handleToggleSoloTrack (e) {
    this.props.toggleSoloTrack()
    this.soloTrackInputElement.blur()
  }

  render () {
    const { title, bpm, gain, musicalKey, height, width, isEditingBeatgrid, pitchSemitones,
      toggleEditBeatgrid, toggleSoloTrack, isSoloTrack, canDeleteTrack } = this.props
    const editBeatgridInputId = uuid()
    const musicalKeyInputId = uuid()
    const gainInputId = uuid()
    const soloInputId = uuid()

    return <div className="TrackControl" style={{ height, width }}>
      <span className="u-multiline-ellipsis-1" title={title}>{title}</span>
      <div>
        BPM: {bpm}
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

      <div onMouseUp={this.onGainInputMouseUp.bind(this)}>
        <input id={gainInputId}
          type='number'
          value={gain}
          onChange={this.handleChangeGain.bind(this)}
          min={0}
          max={2}
          step={0.01}
          ref={(element) => { this.gainInputElement = element }}
        />
        <label htmlFor={gainInputId}>Gain</label>
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
  musicalKey: '',
  pitchSemitones: 0,
  title: '',
  bpm: 0,
  gain: 1
}

module.exports = TrackControl
