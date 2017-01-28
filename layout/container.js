const React = require('react')
const { Link } = require('react-router')
const HTML5Backend = require('react-dnd-html5-backend')
const DragDropContext = require('react-dnd').DragDropContext

class LayoutContainer extends React.Component {
  render () {
    const { children } = this.props

    return <div>
      <Link to='/'>
        <h1>Linx</h1>
      </Link>
      <nav>
        <Link to='/mixes'>mixes</Link>
        <Link to='/samples'>samples</Link>
      </nav>
      <div>{children}</div>
    </div>
  }
}

module.exports = DragDropContext(HTML5Backend)(LayoutContainer)
