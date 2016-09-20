'use strict';

const assert = require('assert');
const mongoose = require('mongoose');
const log = require('../logger');
require('mongoose-currency').loadType(mongoose);
require('mongoose-types').loadTypes(mongoose);

/**
 * MongoDB storage interface
 * @constructor
 * @param {Object} options
 */
function Storage(options) {
  if (!(this instanceof Storage)) {
    return new Storage(options);
  }

  assert(typeof options === 'object', 'Invalid storage options supplied');

  this._options = options;
  this.connection = this._connect();
  this.models = this._createBoundModels();
  this.graphqlSchema = this._createBoundGraphqlSchema();

  this.connection.on('error', function(err) {
    log.error('failed to open database connection, reason: %s', err.message);
  });

  this.connection.on('connected', function() {
    log.info('database connection opened');
  });
}

/**
 * Connects to the database
 * @returns {mongoose.Connection}
 */
Storage.prototype._connect = function() {
  var self = this;
  var uri;
  var mongos;
  var ssl = this._options.ssl;

  if (Array.isArray(this._options)) {
    uri = this._options.map(function(conf) {
      if (conf.mongos) {
        mongos = conf.mongos;
      }

      if (conf.ssl) {
        ssl = conf.ssl;
      }

      return self._getConnectionURI(conf);
    }).join(',');
  } else {
    uri = this._getConnectionURI(this._options);
  }

  log.info('opening database connection to %s', uri);

  return mongoose.createConnection(uri, {
    mongos: mongos,
    sslValidate: false,
    checkServerIdentity: false
  });
};

/**
 * Build the connection URI from options
 * @param {Object} _options
 * @returns {String}
 */
Storage.prototype._getConnectionURI = function(_options) {
  var proto = 'mongodb://';
  var address = _options.host + ':' + _options.port;
  var dbname = '/' + _options.name;
  var creds = _options.user && _options.pass ?
             _options.user + ':' + _options.pass + '@' : '';

  return [proto, creds, address, dbname].join('');
};

/**
 * Return a dictionary of models bound to this connection
 * @returns {Object}
 */
Storage.prototype._createBoundModels = function() {
  var bound = {};
  var models = {
    Bucket: require('./models/bucket'),
    PublicKey: require('./models/pubkey'),
    User: require('./models/user'),
    Credit: require('./models/credit'),
    Debit: require('./models/debit'),
    UserNonce: require('./models/usernonce'),
    Token: require('./models/token'),
    Contact: require('./models/contact'),
    Shard: require('./models/shard'),
    BucketEntry: require('./models/bucketentry'),
    Frame: require('./models/frame'),
    Pointer: require('./models/pointer')
  };

  for (let model in models) {
    bound[model] = models[model](this.connection);
  }

  return bound;
};

Storage.prototype._createBoundGraphqlSchema = function(){
  const graphqlService = require('../server/graphql');

  return graphqlService.bindSchema(this.models);
};

module.exports = Storage;
