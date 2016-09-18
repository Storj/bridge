'use strict';

const storj = require('storj');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const BucketSchema = require('../../lib/storage/models/bucket');

var Bucket;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Bucket = BucketSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Bucket.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Bucket', function() {

  describe('#create', function() {

    it('should create the bucket with the default props', function(done) {
      Bucket.create({ _id: 'user@domain.tld' }, { name: 'New Bucket' }, function(err, bucket) {
        expect(err).to.not.be.instanceOf(Error);
        expect(bucket.storage).to.equal(10);
        expect(bucket.transfer).to.equal(30);
        Bucket.findOne({ _id: bucket.id }, function(err, bucket) {
          expect(err).to.not.be.instanceOf(Error);
          expect(bucket.storage).to.equal(10);
          expect(bucket.transfer).to.equal(30);
          expect(bucket.status).to.equal('Active');
          expect(bucket.name).to.equal('New Bucket');
          expect(bucket.pubkeys).to.have.lengthOf(0);
          expect(bucket.user).to.equal('user@domain.tld');
          done();
        });
      });
    });

    it('should create the bucket with the given special character', function(done) {
      Bucket.create({ _id: 'user@domain.tld' }, {
        storage: 33.3,
        transfer: 55.5,
        name: 'My Bucket with special character üèß'
      }, function(err, bucket) {
        expect(err).to.not.be.instanceOf(Error);
        Bucket.findOne({ _id: bucket.id }, function(err, bucket) {
          expect(err).to.equal(null);
          expect(bucket.storage).to.equal(33.3);
          expect(bucket.transfer).to.equal(55.5);
          expect(bucket.status).to.equal('Active');
          expect(bucket.name).to.equal('My Bucket with special character üèß');
          expect(bucket.pubkeys).to.have.lengthOf(0);
          expect(bucket.user).to.equal('user@domain.tld');
          done();
        });
      });
    });

    it('should create the bucket with the given key', function(done) {
      var publicKey1 = storj.KeyPair().getPublicKey();
      var publicKey2 = storj.KeyPair().getPublicKey();
      expect(publicKey1).to.not.equal(publicKey2);
      Bucket.create({ _id: 'user@domain.tld' }, {
        pubkeys: [publicKey1, publicKey2]
      }, function(err, bucket) {
        expect(err).to.not.be.instanceOf(Error);
        expect(bucket.storage).to.equal(10);
        expect(bucket.transfer).to.equal(30);
        Bucket.findOne({ _id: bucket.id }, function(err, bucket) {
          expect(err).to.not.be.instanceOf(Error);
          expect(bucket.storage).to.equal(10);
          expect(bucket.transfer).to.equal(30);
          expect(bucket.status).to.equal('Active');
          expect(bucket.pubkeys[0]).to.equal(publicKey1);
          expect(bucket.pubkeys[1]).to.equal(publicKey2);
          expect(bucket.user).to.equal('user@domain.tld');
          done();
        });
      });
    });

    it('should create the bucket with duplicate key', function(done) {
      var publicKey = storj.KeyPair().getPublicKey();
      Bucket.create({ _id: 'user@domain.tld' }, {
        pubkeys: [publicKey, publicKey]
      }, function(err, bucket) {
        expect(err).to.not.be.instanceOf(Error);
        expect(bucket.storage).to.equal(10);
        expect(bucket.transfer).to.equal(30);
        Bucket.findOne({ _id: bucket.id }, function(err, bucket) {
          expect(err).to.not.be.instanceOf(Error);
          expect(bucket.storage).to.equal(10);
          expect(bucket.transfer).to.equal(30);
          expect(bucket.status).to.equal('Active');
          expect(bucket.pubkeys[0]).to.equal(publicKey);
          expect(bucket.pubkeys[1]).to.equal(publicKey);
          expect(bucket.user).to.equal('user@domain.tld');
          done();
        });
      });
    });

  });

});
