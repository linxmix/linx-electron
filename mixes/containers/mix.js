const React = require('react')
const { connect } = require('react-redux')

const { getMixProps } = require('../getters')
const { loadMix } = require('../actions')

class MixContainer extends React.Component {
  render () {
    const { mix, isLoading, error } = this.props

    return <div>
      <header>
        <div>mix is {isLoading ? 'loading' : 'here'}</div>
        <div>{error ? error : 'no errors'}</div>
      </header>
      <section>
        {mix.id}
      </section>
    </div>
  }

  componentDidMount () {
    const { loadMix, mix, mixId } = this.props

    if (!mix) {
      loadMix(mixId)
    }
  }
}

module.exports = connect(
  (state, ownProps) => {
    const props = getMixProps(state)
    const currentMixId = ownProps.params.mixId
    return { ...props, mixId: currentMixId, mix: props.mixes[currentMixId] }
  },
  { loadMix }
)(MixContainer)
