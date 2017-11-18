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
  }

  render () {
    const { title, bpm, musicalKey, height, width, isEditingBeatgrid, pitchSemitones,
      toggleEditBeatgrid, toggleSoloTrack, isSoloTrack, canDeleteTrack } = this.props
    const editBeatgridInputId = uuid()
    const musicalKeyInputId = uuid()
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
        />
        <label htmlFor={musicalKeyInputId}>Key: {musicalKey} </label>
      </div>
      <div style={{ cursor: 'pointer' }}>
        <input id={editBeatgridInputId}
          type='checkbox' checked={isEditingBeatgrid} onChange={toggleEditBeatgrid} />
        <label htmlFor={editBeatgridInputId}>Edit Beatgrid</label>
      </div>
      <div style={{ cursor: 'pointer' }}>
        <input id={soloInputId}
          type='checkbox' checked={isSoloTrack} onChange={toggleSoloTrack} />
        <label htmlFor={soloInputId}>Solo Track</label>
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
  bpm: 0
}

module.exports = TrackControl
