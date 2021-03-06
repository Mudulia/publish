import {Component, h} from 'preact'
import {Router, route} from '@dadi/preact-router'
import {bindActionCreators} from 'redux'
import Socket from 'lib/socket'

import * as userActions from 'actions/userActions'
import * as apiActions from 'actions/apiActions'
import * as appActions from 'actions/appActions'
import * as documentActions from 'actions/documentActions'
import * as Constants from 'lib/constants'

import DocumentCreateView from 'views/DocumentCreateView/DocumentCreateView'
import DocumentEditView from 'views/DocumentEditView/DocumentEditView'
import DocumentListView from 'views/DocumentListView/DocumentListView'
import ErrorView from 'views/ErrorView/ErrorView'
import HomeView from 'views/HomeView/HomeView'
import PasswordResetView from 'views/PasswordResetView/PasswordResetView'
import SignInView from 'views/SignInView/SignInView'
import SignOutView from 'views/SignOutView/SignOutView'
import ProfileEditView from 'views/ProfileEditView/ProfileEditView'

import {connectHelper, debounce} from 'lib/util'
import Analytics from 'lib/analytics'
import ConnectionMonitor from 'lib/status'
import apiBridgeClient from 'lib/api-bridge-client'

class App extends Component {

  componentWillMount() {
    const {actions, state} = this.props

    apiBridgeClient.registerProgressCallback(actions.registerNetworkCall)
    // We only load the config at this point if the user is already signed in
    // (existing session). Otherwise, it will be loaded upon successful login.
    if (state.user.status === Constants.STATUS_LOADED) {
      actions.loadAppConfig()
    }
  }

  componentDidMount() {
    const {actions} = this.props

    window.addEventListener('resize', debounce(() => {
      actions.setScreenWidth(window.innerWidth)
    }, 500))
    document.addEventListener("dragstart", this.handleDragDropEvents, false)
    document.addEventListener("dragend", this.handleDragDropEvents, false)
    document.addEventListener("dragover", this.handleDragDropEvents, false)
    document.addEventListener("dragenter", this.handleDragDropEvents, false)
    document.addEventListener("dragleave", this.handleDragDropEvents, false)
    document.addEventListener("drop", this.handleDragDropEvents, false)
  }

  componentDidUpdate(previousProps) {
    const {actions, state} = this.props
    const previousState = previousProps.state
    const room = previousState.router.room
    const conf = state.app.config
    const prevConf = previousState.app.config

    if (
      (!prevConf && conf) &&
        conf.server.healthcheck.enabled
    ) {
      this.monitor = new ConnectionMonitor()
        .watch(conf.server.healthcheck.frequency)
        .registerStatusChangeCallback(actions.setNetworkStatus)

      if (conf.ga.enabled) {
        this.analytics = new Analytics()
          .register(conf.ga.trackingId)
          .pageview(state.router.locationBeforeTransitions.pathname)
      }
    }

    // State change: user has signed in.
    if (
      previousState.user.status === Constants.STATUS_FAILED &&
      state.user.status === Constants.STATUS_LOADED
    ) {
      actions.loadAppConfig()

      return route('/')
    }

    // State change: user has signed out.
    if (
      previousState.user.status === Constants.STATUS_LOADED &&
      state.user.hasSignedOut
    ) {
      return route('/sign-in')
    }

    // State change: app now has config.
    if (!prevConf && conf && !state.api.error) {
      actions.loadApis()
      this.socket = new Socket(conf.publicUrl.port || conf.server.port)
        .on('userListChange', this.handleUserListChange.bind(this))
    }

    if (this.socket && this.socket.getRoom() !== room) {
      this.socket.setRoom(room)
    }

    if (
      this.socket &&
      previousState.user.remote && !previousState.user.remote.error &&
      previousState.user.remote !== this.socket.getUser()
    ) {
      this.socket.setUser(previousState.user.remote)
    }
  }

  render() {
    const {history, state} = this.props

    if (state.api.error) {
      return (
        <ErrorView type={Constants.API_CONNECTION_ERROR} data={state.api.error} />
      )
    }

    if (
      !state.api.paths ||
      (
        state.api.status === Constants.STATUS_FAILED &&
        state.user.status === Constants.STATUS_LOADED
      )
    ) {
      return (
        <ErrorView type={Constants.STATUS_FAILED} />
      )
    }

    return (
      <Router
        history={history}
        onChange={this.handleRouteChange.bind(this)}
      >
        <HomeView
          authenticate
          path="/"
        />

        <PasswordResetView
          path="/reset"
        />

        {state.api.paths.create.map(path => (
          <DocumentCreateView
            authenticate
            path={path}
          />
        ))}

        {state.api.paths.edit.map(path => (
          <DocumentEditView
            authenticate
            path={path}
          />
        ))}

        {state.api.paths.list.map(path => (
          <DocumentListView
            authenticate
            path={path}
          />
        ))}

        <ProfileEditView
          authenticate
          path="/profile/:section?"
        />

        <ProfileEditView
          authenticate
          path="/profile/select/:referencedField?/:page?[^\d+$]"
        />

        <SignInView
          path="/sign-in/:token?"
        />

        <SignOutView
          path="/sign-out"
        />

        <ErrorView
          authenticate
          default
          type={Constants.ERROR_ROUTE_NOT_FOUND}
        />
      </Router>
    )
  }

  /**
   * Handle Drag Drop Events 
   * Block and drag and drop actions to handle accidental
   * drop outside of FileUpload and other asset drop handlers.
   * @param  {Event} event Event listener object.
   */
  handleDragDropEvents(event) {
    event.preventDefault()
  }

  handleRouteChange(event) {
    const {state} = this.props
    const isAuthenticatedRoute = event.current &&
      event.current.attributes &&
      event.current.attributes.authenticate

    if (this.analytics && this.analytics.isActive()) {
      this.analytics.pageview(event.url)
    }

    if (
      !state.user.authEnabled &&
      (event.url === '/sign-in')
    ) {
      return route('/')
    }

    if (
      (isAuthenticatedRoute && state.user.status !== Constants.STATUS_LOADED) ||
      event.url === '/sign-out'
    ) {
      return route('/sign-in')
    }
  }

  handleUserListChange(data) {
    const {state, actions} = this.props

    // Store connected users in state.
    // Filter current user.
    if (state.user && state.user.remote) {
      actions.setDocumentPeers(data.body.users
        .filter(socketUser => socketUser.handle !== state.user.remote.handle))
    }
  }
}

export default connectHelper(
  state => state,
  dispatch => bindActionCreators({
    ...apiActions,
    ...appActions,
    ...documentActions,
    ...userActions
  }, dispatch)
)(App)
