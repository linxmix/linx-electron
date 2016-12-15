const React = require('react')
const { Route, IndexRedirect } = require('react-router')

const LayoutContainer = require('./layout/container')

module.exports = <Route path='/' component={LayoutContainer}>
  { require('./mixes/routes') }
  { require('./samples/routes') }
  <IndexRedirect to='/mixes' />
</Route>
