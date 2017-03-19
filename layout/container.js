const React = require('react')
const { Link } = require('react-router')
const { DragDropContext } = require('react-dnd')
const { default: HTML5Backend } = require('react-dnd-html5-backend')
const { default: MouseBackEnd } = require('react-dnd-mouse-backend')
const MultiBackEnd = require('react-dnd-multi-backend')

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
module.exports = DragDropContext(MultiBackEnd(HTML5Backend, MouseBackEnd))(LayoutContainer)
