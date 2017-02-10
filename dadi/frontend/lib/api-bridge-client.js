'use strict'

import 'whatwg-fetch'

const APIWrapper = require('@dadi/api-wrapper-core')

module.exports = ({host, port, version, database}) => {
  let uri = host
  const APIBridgeClient = function () {

  }

  APIBridgeClient.prototype = new APIWrapper({
    uri,
    port,
    version,
    database
  })

  APIBridgeClient.prototype._fetch = function (requestObject) {
    return fetch('/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(requestObject)
    }).then(response => {
      return response.json().then(json => {
        return JSON.parse(json)
      })
    })
  }

  APIBridgeClient.prototype._find = APIBridgeClient.prototype.find
  APIBridgeClient.prototype._getCollections = APIBridgeClient.prototype.getCollections
  APIBridgeClient.prototype._getStatus = APIBridgeClient.prototype.getStatus
  APIBridgeClient.prototype._getConfig = APIBridgeClient.prototype.getConfig

  APIBridgeClient.prototype.find = function () {
    return this._fetch(this._find(arguments))
  }
  APIBridgeClient.prototype.getCollections = function () {
    return this._fetch(this._getCollections(arguments))
  }
  APIBridgeClient.prototype.getStatus = function () {
    return this._fetch(this._getStatus(arguments))
  }

  APIBridgeClient.prototype.getConfig = function () {
    return this._fetch(this._getConfig(arguments))
  }

  return new APIBridgeClient()
}
