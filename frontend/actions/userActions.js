import 'fetch'

import * as Constants from 'lib/constants'
import * as Types from 'actions/actionTypes'
import * as documentActions from 'actions/documentActions'

import {getApiForUrlParams, getCollectionForUrlParams} from 'lib/collection-lookup'
import apiBridgeClient from 'lib/api-bridge-client'

export function authenticate (client) {
  return {
    client,
    type: Types.AUTHENTICATE
  }
}

export function registerFailedSignInAttempt (errorStatus) {
  return {
    errorStatus,
    type: Types.REGISTER_FAILED_SIGN_IN
  }
}

export function setPasswordReset ({
  resetEmail
} = {}) {
  return {
    resetEmail,
    type: Types.REQUEST_PASSWORD_RESET
  }
}

export function setPasswordResetSuccess ({
  response
} = {}) {
  return {
    error: response.error,
    success: response.success,
    type: Types.REQUEST_PASSWORD_RESET_SUCCESS
  }
}

export function requestPasswordReset (resetEmail) {
  return (dispatch, getState) => {
    return runSessionQuery({path: '/session/reset-token', payload: {email: resetEmail}})
      .then(response => {
        dispatch(setPasswordReset({resetEmail}))
      })
  }
}

export function passwordReset (token, password) {
  return (dispatch, getState) =>
    runSessionQuery({path: '/session/password-reset', payload: {
      password,
      token
    }})
    .then(response => dispatch(setPasswordResetSuccess({response})))
}

/**
 * Run Session Query
 * @param  {String} options.method Request method
 * @param  {String} options.path Relative path
 * @param  {Object} options.payload Optional data payload (POST only)
 * @return {Promise} Fetch callback Promise
 */
function runSessionQuery ({
  method = 'GET',
  path = '/session',
  payload = null
} = {}) {
  let request = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    method: method
  }

  if (payload) {
    // Force POST method if there is a payload.
    if (request.method === 'GET') {
      request.method = 'POST'
    }

    // JSON stringify payload.
    request.body = JSON.stringify(payload)
  }

  return fetch(path, request).then(response =>
    response.json()
      .then(parsedResponse =>
        response.status === 200 ? parsedResponse : Promise.reject(parsedResponse)
      )
  )
}

/**
 * Save User
 * @param  {String} options.api API handle
 * @param  {String} options.collection Collection handle
 * @param  {Object} options.user User payload body
 * @return {Promise} API request Promise callback
 */
export function saveUser ({api, collection, user}) {
  return (dispatch, getState) => {
    const currentUser = getState().user.remote

    dispatch(documentActions.setRemoteDocumentStatus(Constants.STATUS_SAVING))

    const apiBridge = apiBridgeClient({
      accessToken: getState().user.accessToken,
      api,
      collection
    }).whereFieldIsEqualTo('_id', currentUser._id)
      .whereFieldIsEqualTo('email', currentUser.email)

    apiBridge.update(user).then(response => {
      if (response.results && response.results.length) {
        const newUser = response.results[0]

        // Update store
        dispatch(documentActions.setRemoteDocument(newUser, {
          clearLocal: true
        }))
        dispatch(setRemoteUser(newUser))

        // Update session user
        updateLocalUser(newUser)
      } else {
        dispatch(documentActions.setRemoteDocumentStatus(Constants.STATUS_FAILED))
      }
    }).catch(errors => {
      const passwordField = Object.keys(collection.fields).find(fieldName => {
        return collection.fields[fieldName].publish &&
          collection.fields[fieldName].publish.subType === 'Password'
      })

      if (!passwordField) return

      let validationErrors = getState().document.validationErrors[passwordField] || []

      if (Array.isArray(errors)) {
        errors.forEach(error => {
          if (error.details && error.details.includes('\'WRONG_PASSWORD\'')) {
            validationErrors.push(Constants.ERROR_WRONG_PASSWORD)
          }
        })

        dispatch(documentActions.setFieldErrorStatus(
          passwordField,
          null,
          validationErrors
        ))
      }
    })
  }
}

/**
 * Set User Status
 * @param {String} status Status of user
 */
export function setUserStatus (status) {
  return {
    status,
    type: Types.SET_USER_STATUS
  }
}

export function signIn (clientId, secret) {
  return (dispatch, getState) => {
    let apiUrl = getState().app.config.apis[0].host
    let options = {
      body: JSON.stringify({
        clientId,
        secret
      }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST'
    }

    return fetch(`${apiUrl}/token`, options)
      .then(response => response.json())
      .then(response => {
        if (typeof response.accessToken === 'string') {
          return dispatch(authenticate(response))
        }

        return Promise.reject(response)
      })
  }
}

export function signOut () {
  return {
    type: Types.SIGN_OUT
  }
}

function updateLocalUser (newUser) {
  return runSessionQuery({
    method: 'PUT',
    payload: newUser
  })
}
