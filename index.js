const { createStore, compose, applyMiddleware } = require('redux')
const { install: installReduxLoop } = require('redux-loop')
const createLogger = require('redux-logger')
const React = require('react')
const ReactDOM = require('react-dom')
const { Provider } = require('react-redux')
const { Router, createMemoryHistory } = require('react-router')
const { routerMiddleware, syncHistoryWithStore } = require('react-router-redux')

const insertCss = require('insert-css')
insertCss(require('fs').readFileSync('styles/file-drop.css', 'utf-8'))

const config = require('./config')
const routes = require('./routes')
const reducer = require('./reducer')(config)

const memoryHistory = createMemoryHistory()
const enhancer = compose(
  installReduxLoop(),
  applyMiddleware(
    createLogger(),
    routerMiddleware(memoryHistory)
  )
)

const store = createStore(reducer, undefined, enhancer)
const history = syncHistoryWithStore(memoryHistory, store)

ReactDOM.render(
  <Provider store={store}>
    <Router history={history}>
      { routes }
    </Router>
  </Provider>,
  document.getElementById('main')
)
