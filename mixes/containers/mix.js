const React = require('react')
const { connect } = require('react-redux')
const { forEach, last, get } = require('lodash')
// const FileDrop = require('react-file-drop')

const { getMixProps } = require('../getters')
const { saveMix, loadMix, deleteMix, reorderPrimaryTrack } = require('../actions')
const { updateMeta } = require('../../metas/actions')
const { createPrimaryTrackFromFile } = require('../../channels/actions')
const { validNumberOrDefault } = require('../../lib/number-utils')
const PrimaryTrackTable = require('../components/primary-track-table')

class MixContainer extends React.Component {
  onFilesDrop (e) {
    const { mix, createPrimaryTrackFromFile } = this.props
    const files = e && e.dataTransfer && e.dataTransfer.files
    const lastPrimaryTrack = last(mix.primaryTracks || [])
    const startBeat = validNumberOrDefault(get(lastPrimaryTrack, 'channel.startBeat'), 0)

    console.log('file drop', e)
    if (files && files.length) {
      e.preventDefault()
      e.stopPropagation()
      forEach(files, (file, i) => createPrimaryTrackFromFile({
        file,
        parentChannelId: mix.channel.id,
        attrs: {
          startBeat: startBeat + i
        }
      }))
    }
  }

  onChangeMixTitle (e) {
    const newTitle = e && e.target && e.target.value
    const { mix, updateMeta } = this.props
    updateMeta({ id: mix.id, title: newTitle })
  }

  render () {
    const { mix, error, sampleError, saveMix, deleteMix, reorderPrimaryTrack } = this.props
    if (!mix) { return null }
    console.log('mix', mix)

    const { isSaving, isLoading, isDirty } = mix
    const titleElement = isLoading
      ? <div>'{mix.meta.title}' is loading</div>
      : <input type='text'
        value={mix.meta.title}
        placeholder='Untitled Mix'
        onChange={this.onChangeMixTitle.bind(this)} />

    // TODO: replace with react-dnd equivalent
      // <FileDrop
      //  frame={document}
      //  onFrameDrop={this.onFilesDrop.bind(this)} />

    return <div>
      <header>
        {titleElement}
        <div>{error || sampleError || 'no errors'}</div>
        <button disabled={!isDirty || (isLoading || isSaving)} onClick={() => saveMix(mix)}>
          Save Mix
        </button>
        <button disabled={isLoading || isSaving} onClick={() => deleteMix(mix)}>
          Delete Mix
        </button>
      </header>
      <section>
        <PrimaryTrackTable
          tracks={mix.primaryTracks}
          reorderPrimaryTrack={reorderPrimaryTrack}
          isLoading={isLoading}
        />
      </section>
    </div>
  }

  componentDidMount () {
    const { loadMix, mix } = this.props

    if (mix && !mix.channel.type) {
      loadMix(mix.id)
    }
  }
}

module.exports = connect(
  (state, ownProps) => {
    const props = getMixProps(state)
    const currentMixId = ownProps.params.mixId
    const { router, route } = ownProps
    const mix = props.mixes[currentMixId]

    if (mix) {
      router.setRouteLeaveHook(
        route,
        // TODO: do i need to back out all changes if confirm? how to do that cleanly - LOAD_MIX? ROLLBACK_MIX?
        () => !mix.isDirty ||
          window.confirm('You have unsaved changes that will be lost if you leave this page.')
      )
    }

    return { ...props, mix }
  },
  { saveMix, loadMix, deleteMix, updateMeta, createPrimaryTrackFromFile, reorderPrimaryTrack }
)(MixContainer)
