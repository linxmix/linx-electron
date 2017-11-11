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
      toggleEditBeatgrid } = this.props
    const editBeatgridInputId = uuid()
    const musicalKeyInputId = uuid()

    return <div className="TrackControl" style={{ height, width }}>
      <span className="u-multiline-ellipsis-2">{title}</span>
      <div>BPM: {bpm}</div>
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
      <div>
        <input id={editBeatgridInputId}
          type='checkbox' checked={isEditingBeatgrid} onChange={toggleEditBeatgrid} />
        <label htmlFor={editBeatgridInputId}>Edit Beatgrid</label>
      </div>
    </div>
  }
}

TrackControl.defaultProps = {
  height: 100,
  width: '100%'
}

module.exports = TrackControl
