const React = require('react')
const { connect } = require('react-redux')

const { getMixProps } = require('../getters')
const { saveMix, loadMix, deleteMix } = require('../actions')
const { updateMeta } = require('../../metas/actions')

class MixContainer extends React.Component {
  onChangeMixTitle (e) {
    const newTitle = e && e.target && e.target.value
    const { mix, updateMeta } = this.props
    updateMeta({ id: mix.id, title: newTitle })
  }

  render () {
    const { mix, error, saveMix, deleteMix } = this.props
    if (!mix) { return null }
    console.log('mix', mix)

    const { isSaving, isLoading, isDirty } = mix
    const titleElement = isLoading
      ? <div>'{mix.meta.title}' is loading</div>
      : <input type='text'
        value={mix.meta.title}
        placeholder='Untitled Mix'
        onChange={this.onChangeMixTitle.bind(this)} />

    return <div>
      <header>
        {titleElement}
        <div>{error || 'no errors'}</div>
        <button disabled={!isDirty || (isLoading || isSaving)} onClick={() => saveMix(mix)}>
          Save Mix
        </button>
        <button disabled={isLoading || isSaving} onClick={() => deleteMix(mix)}>
          Delete Mix
        </button>
      </header>
      <section key={mix.id}>
        {mix.primaryTracks.map(track => {
          return <div key={track.id} >{track.meta.title}</div>
        })}
      </section>
    </div>
  }

  componentDidMount () {
    // const { loadMix, mix, mixId } = this.props

    // TODO: remove this?
    // note this breaks if we navigate to a new mix which hasnt yet been added to the store.
    // if (!mix) {
      // loadMix(mixId)
    // }
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

    return { ...props, mix, mixId: currentMixId }
  },
  { saveMix, loadMix, deleteMix, updateMeta }
)(MixContainer)
