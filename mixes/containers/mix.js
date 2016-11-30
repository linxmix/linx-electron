const React = require('react')
const { connect } = require('react-redux')

const { getMixProps } = require('../getters')
const { loadMix } = require('../actions')

class MixContainer extends React.Component {
  render () {
    const { mix, isLoading } = this.props

    console.log('mix', mix)

    return <div>
      <header>
        mix is {isLoading ? 'loading' : 'here'}
      </header>
      <section>
        {mix.id}
      </section>
    </div>
  }

  componentDidMount () {
    const { loadMix, mix } = this.props
    loadMix({ id: mix.id })
  }
}

module.exports = connect(
  (state, ownProps) => {
    const props = getMixProps(state)
    const currentMixId = ownProps.params.mixId
    return { ...props, mix: props.mixes[currentMixId] }
  },
  { loadMix }
)(MixContainer)
