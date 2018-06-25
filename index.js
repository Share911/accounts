'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Accounts = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var createUser = function () {
  var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(options) {
    var username, email, user, hashed, userId;
    return _regenerator2.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            // Unknown keys allowed, because a onCreateUserHook can take arbitrary
            // options.
            (0, _meteorCheck.check)(options, _meteorCheck.Match.ObjectIncluding({
              username: _meteorCheck.Match.Optional(String),
              email: _meteorCheck.Match.Optional(String),
              password: _meteorCheck.Match.Optional(passwordValidator)
            }));

            username = options.username;
            email = options.email;

            if (!(!username && !email)) {
              _context3.next = 5;
              break;
            }

            throw new Meteor.Error(400, "Need to set a username or email");

          case 5:
            user = { services: {} };

            if (!options.password) {
              _context3.next = 11;
              break;
            }

            _context3.next = 9;
            return hashPassword(options.password);

          case 9:
            hashed = _context3.sent;

            user.services.password = { bcrypt: hashed };

          case 11:

            if (username) user.username = username;
            if (email) user.emails = [{ address: email, verified: false }];

            // Perform a case insensitive check before insert
            _context3.next = 15;
            return checkForCaseInsensitiveDuplicates({ db: options.db }, 'username', 'Username', username);

          case 15:
            _context3.next = 17;
            return checkForCaseInsensitiveDuplicates({ db: options.db }, 'emails.address', 'Email', email);

          case 17:
            _context3.next = 19;
            return insertUserDoc({ db: options.db }, options, user);

          case 19:
            userId = _context3.sent;
            _context3.prev = 20;
            _context3.next = 23;
            return checkForCaseInsensitiveDuplicates({ db: options.db }, 'username', 'Username', username, userId);

          case 23:
            _context3.next = 25;
            return checkForCaseInsensitiveDuplicates({ db: options.db }, 'emails.address', 'Email', email, userId);

          case 25:
            _context3.next = 32;
            break;

          case 27:
            _context3.prev = 27;
            _context3.t0 = _context3['catch'](20);
            _context3.next = 31;
            return options.db.collection('users').remove({ _id: userId });

          case 31:
            throw _context3.t0;

          case 32:
            return _context3.abrupt('return', userId);

          case 33:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[20, 27]]);
  }));

  return function createUser(_x7) {
    return _ref4.apply(this, arguments);
  };
}();

var insertUserDoc = function () {
  var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(_ref6, options, user) {
    var db = _ref6.db;
    var fullUser, userId;
    return _regenerator2.default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            // - clone user document, to protect from modification
            // - add createdAt timestamp
            // - prepare an _id, so that you can modify other collections (eg
            // create a first task for every new user)
            //
            // XXX If the onCreateUser or validateNewUser hooks fail, we might
            // end up having modified some other collection
            // inappropriately. The solution is probably to have onCreateUser
            // accept two callbacks - one that gets called before inserting
            // the user document (in which you can modify its contents), and
            // one that gets called after (in which you should change other
            // collections)
            user = _underscore._.extend({
              createdAt: new Date(),
              _id: _meteorRandom.Random.id()
            }, user);

            if (!(user.services && user.services.length > 0)) {
              _context4.next = 3;
              break;
            }

            throw new Error('user.services is not supported in the node.js version');

          case 3:
            if (this && this._onCreateUserHook) {
              fullUser = this._onCreateUserHook(options, user);

              // This is *not* part of the API. We need this because we can't isolate
              // the global server environment between tests, meaning we can't test
              // both having a create user hook set and not having one set.
              if (fullUser === 'TEST DEFAULT HOOK') fullUser = defaultCreateUserHook(options, user);
            } else {
              fullUser = defaultCreateUserHook(options, user);
            }

            _underscore._.each(this && this._validateNewUserHooks, function (hook) {
              if (!hook(fullUser)) throw new Meteor.Error(403, "User validation failed");
            });

            _context4.prev = 5;
            _context4.next = 8;
            return db.collection('users').insertOne(fullUser);

          case 8:
            userId = _context4.sent.insertedId;
            _context4.next = 22;
            break;

          case 11:
            _context4.prev = 11;
            _context4.t0 = _context4['catch'](5);

            if (!(_context4.t0.name !== 'MongoError')) {
              _context4.next = 15;
              break;
            }

            throw _context4.t0;

          case 15:
            if (!(_context4.t0.code !== 11000)) {
              _context4.next = 17;
              break;
            }

            throw _context4.t0;

          case 17:
            if (!(_context4.t0.errmsg.indexOf('emails.address') !== -1)) {
              _context4.next = 19;
              break;
            }

            throw new Meteor.Error(403, "Email already exists.");

          case 19:
            if (!(_context4.t0.errmsg.indexOf('username') !== -1)) {
              _context4.next = 21;
              break;
            }

            throw new Meteor.Error(403, "Username already exists.");

          case 21:
            throw _context4.t0;

          case 22:
            return _context4.abrupt('return', userId);

          case 23:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[5, 11]]);
  }));

  return function insertUserDoc(_x8, _x9, _x10) {
    return _ref5.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _meteorCheck = require('meteor-check');

var _meteorError = require('@share911/meteor-error');

var Meteor = _interopRequireWildcard(_meteorError);

var _bcrypt = require('bcrypt');

var _bcrypt2 = _interopRequireDefault(_bcrypt);

var _meteorSha = require('@share911/meteor-sha');

var _meteorRandom = require('@share911/meteor-random');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Given a 'password' from the client, extract the string that we should
// bcrypt. 'password' can be one of:
//  - String (the plaintext password)
//  - Object with 'digest' and 'algorithm' keys. 'algorithm' must be "sha-256".
//
var getPasswordString = function getPasswordString(password) {
  if (typeof password === "string") {
    password = (0, _meteorSha.SHA256)(password);
  } else {
    // 'password' is an object
    if (password.algorithm !== "sha-256") {
      throw new Error("Invalid password hash algorithm. " + "Only 'sha-256' is allowed.");
    }
    password = password.digest;
  }
  return password;
};

// Use bcrypt to hash the password for storage in the database.
// `password` can be a string (in which case it will be run through
// SHA256 before bcrypt) or an object with properties `digest` and
// `algorithm` (in which case we bcrypt `password.digest`).
//
var hashPassword = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(password) {
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            password = getPasswordString(password);
            _context.next = 3;
            return _bcrypt2.default.hash(password, 10);

          case 3:
            return _context.abrupt('return', _context.sent);

          case 4:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function hashPassword(_x) {
    return _ref.apply(this, arguments);
  };
}();

///
/// CREATING USERS
///

// Generates a MongoDB selector that can be used to perform a fast case
// insensitive lookup for the given fieldName and string. Since MongoDB does
// not support case insensitive indexes, and case insensitive regex queries
// are slow, we construct a set of prefix selectors for all permutations of
// the first 4 characters ourselves. We first attempt to matching against
// these, and because 'prefix expression' regex queries do use indexes (see
// http://docs.mongodb.org/v2.6/reference/operator/query/regex/#index-use),
// this has been found to greatly improve performance (from 1200ms to 5ms in a
// test with 1.000.000 users).
var selectorForFastCaseInsensitiveLookup = function selectorForFastCaseInsensitiveLookup(fieldName, string) {
  // Performance seems to improve up to 4 prefix characters
  var prefix = string.substring(0, Math.min(string.length, 4));
  var orClause = _underscore._.map(generateCasePermutationsForString(prefix), function (prefixPermutation) {
    var selector = {};
    selector[fieldName] = new RegExp('^' + _escapeRegExp(prefixPermutation));
    return selector;
  });
  var caseInsensitiveClause = {};
  caseInsensitiveClause[fieldName] = new RegExp('^' + _escapeRegExp(string) + '$', 'i');
  return { $and: [{ $or: orClause }, caseInsensitiveClause] };
};

// Generates permutations of all case variations of a given string.
var generateCasePermutationsForString = function generateCasePermutationsForString(string) {
  var permutations = [''];
  for (var i = 0; i < string.length; i++) {
    var ch = string.charAt(i);
    permutations = _underscore._.flatten(_underscore._.map(permutations, function (prefix) {
      var lowerCaseChar = ch.toLowerCase();
      var upperCaseChar = ch.toUpperCase();
      // Don't add unneccesary permutations when ch is not a letter
      if (lowerCaseChar === upperCaseChar) {
        return [prefix + ch];
      } else {
        return [prefix + lowerCaseChar, prefix + upperCaseChar];
      }
    }));
  }
  return permutations;
};

var checkForCaseInsensitiveDuplicates = function () {
  var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(_ref3, fieldName, displayName, fieldValue, ownUserId) {
    var db = _ref3.db;
    var skipCheck, matchedUsers;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            // Some tests need the ability to add users with the same case insensitive
            // value, hence the _skipCaseInsensitiveChecksForTest check
            skipCheck = _underscore._.has(Accounts._skipCaseInsensitiveChecksForTest, fieldValue);

            if (!(fieldValue && !skipCheck)) {
              _context2.next = 7;
              break;
            }

            _context2.next = 4;
            return db.collection('users').find(selectorForFastCaseInsensitiveLookup(fieldName, fieldValue)).toArray();

          case 4:
            matchedUsers = _context2.sent;

            if (!(matchedUsers.length > 0 && (
            // If we don't have a userId yet, any match we find is a duplicate
            !ownUserId ||
            // Otherwise, check to see if there are multiple matches or a match
            // that is not us
            matchedUsers.length > 1 || matchedUsers[0]._id !== ownUserId))) {
              _context2.next = 7;
              break;
            }

            throw new Meteor.Error(403, displayName + " already exists.");

          case 7:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function checkForCaseInsensitiveDuplicates(_x2, _x3, _x4, _x5, _x6) {
    return _ref2.apply(this, arguments);
  };
}();

var passwordValidator = _meteorCheck.Match.OneOf(String, { digest: String, algorithm: String });

function defaultCreateUserHook(options, user) {
  if (options.profile) user.profile = options.profile;
  return user;
}

var Accounts = exports.Accounts = {
  createUser: createUser
};