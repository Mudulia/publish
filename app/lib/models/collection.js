'use strict'

const CollectionRoutes = require(`${paths.lib.helpers}/collection-routes`)
const config = require(paths.config)
const DadiAPI = require('@dadi/api-wrapper')
const log = require('@dadi/logger')

const Collection = function () {}

const formatAPIError = err => {
  switch (err.code) {
    case 404:
      return {detail: 'One or more APIs are unreachable. Please check your config.'}
    case 401:
      return {detail: 'The credentials for your API are incorrect.'}
  }
}

Collection.prototype.buildCollectionRoutes = function () {
  log.debug({ module: 'collection' }, 'Building collection Routes')
  return this.getCollections()
    .then(apiCollections => new CollectionRoutes().generateApiRoutes(apiCollections))
    .catch(err => Promise.reject(formatAPIError(err)))
}

Collection.prototype.getCollections = function () {
  log.debug({ module: 'collection' }, 'Requesting collection list from API')
  return Promise.all(
    config
      .get('apis')
      .map(api => {
        return new DadiAPI(Object.assign(api, {uri: api.host}))
        .getCollections()
        .then(res => this.getSchemas(api, res.collections))
      })
  )
}

Collection.prototype.getSchemas = function (api, collections) {
  return Promise.all(
    collections
      .map(collection => {
        log.debug({ module: 'collection' }, `Requesting collection schema for ${collection.slug} from API`)

        return new DadiAPI(Object.assign(api, {uri: api.host}))
          .useDatabase(collection.database)
          .in(collection.slug)
          .getConfig()
          .then(schema => Object.assign(schema, {slug: collection.slug}))
      })
  )
}

module.exports = function () {
  return new Collection()
}

module.exports.Collection = Collection
