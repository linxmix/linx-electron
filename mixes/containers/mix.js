const React = require('react')
const { connect } = require('react-redux')

const { getMixProps } = require('../getters')
const { loadMix, saveMix } = require('../actions')

class MixContainer extends React.Component {
  render () {
    const { mix, isLoading, isSaving, error, saveMix } = this.props
    if (!mix) { return null }

    console.log('mix', mix)

    return <div>
      <header>
        <div>'{mix.meta.title}' is {isLoading ? 'loading' : 'here'}</div>
        <div>{error ? error : 'no errors'}</div>
        <button disabled={isLoading || isSaving} onClick={() => saveMix(mix)}>Save Mix</button>
      </header>
      <section key={mix.id}>
        {mix.primaryTracks.map(track => {
          return <div key={track.id} >{track.meta.title}</div>
        })}
      </section>
    </div>
  }

  componentDidMount () {
    const { loadMix, mix, mixId } = this.props

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
    return { ...props, mixId: currentMixId, mix: props.mixes[currentMixId] }
  },
  { loadMix, saveMix }
)(MixContainer)
