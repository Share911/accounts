"use strict";

var _interopRequireWildcard = require("@babel/runtime-corejs2/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime-corejs2/helpers/interopRequireDefault");

var _Object$defineProperty = require("@babel/runtime-corejs2/core-js/object/define-property");

_Object$defineProperty(exports, "__esModule", {
  value: true
});

exports.validateOptions = validateOptions;
exports.Accounts = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime-corejs2/helpers/typeof"));

var _regenerator = _interopRequireDefault(require("@babel/runtime-corejs2/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime-corejs2/helpers/asyncToGenerator"));

var _underscore = require("underscore");

var Meteor = _interopRequireWildcard(require("@share911/meteor-error"));

var _bcrypt = _interopRequireDefault(require("bcrypt"));

var _meteorSha = require("@share911/meteor-sha");

var _meteorRandom = require("@share911/meteor-random");

function _escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
} // Given a 'password' from the client, extract the string that we should
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
}; // Use bcrypt to hash the password for storage in the database.
// `password` can be a string (in which case it will be run through
// SHA256 before bcrypt) or an object with properties `digest` and
// `algorithm` (in which case we bcrypt `password.digest`).
//


var hashPassword =
/*#__PURE__*/
function () {
  var _ref = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee(password) {
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            password = getPasswordString(password);
            _context.next = 3;
            return _bcrypt["default"].hash(password, 10);

          case 3:
            return _context.abrupt("return", _context.sent);

          case 4:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  return function hashPassword(_x) {
    return _ref.apply(this, arguments);
  };
}(); ///
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
  return {
    $and: [{
      $or: orClause
    }, caseInsensitiveClause]
  };
}; // Generates permutations of all case variations of a given string.


var generateCasePermutationsForString = function generateCasePermutationsForString(string) {
  var permutations = [''];

  for (var i = 0; i < string.length; i++) {
    var ch = string.charAt(i);
    permutations = _underscore._.flatten(_underscore._.map(permutations, function (prefix) {
      var lowerCaseChar = ch.toLowerCase();
      var upperCaseChar = ch.toUpperCase(); // Don't add unneccesary permutations when ch is not a letter

      if (lowerCaseChar === upperCaseChar) {
        return [prefix + ch];
      } else {
        return [prefix + lowerCaseChar, prefix + upperCaseChar];
      }
    }));
  }

  return permutations;
};

var checkForCaseInsensitiveDuplicates =
/*#__PURE__*/
function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee2(_ref2, fieldName, displayName, fieldValue, ownUserId) {
    var db, skipCheck, matchedUsers;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            db = _ref2.db;
            // Some tests need the ability to add users with the same case insensitive
            // value, hence the _skipCaseInsensitiveChecksForTest check
            skipCheck = _underscore._.has(Accounts._skipCaseInsensitiveChecksForTest, fieldValue);

            if (!(fieldValue && !skipCheck)) {
              _context2.next = 8;
              break;
            }

            _context2.next = 5;
            return db.collection('users').find(selectorForFastCaseInsensitiveLookup(fieldName, fieldValue)).toArray();

          case 5:
            matchedUsers = _context2.sent;

            if (!(matchedUsers.length > 0 && ( // If we don't have a userId yet, any match we find is a duplicate
            !ownUserId || // Otherwise, check to see if there are multiple matches or a match
            // that is not us
            matchedUsers.length > 1 || matchedUsers[0]._id !== ownUserId))) {
              _context2.next = 8;
              break;
            }

            throw new Meteor.Error(403, displayName + " already exists.");

          case 8:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));

  return function checkForCaseInsensitiveDuplicates(_x2, _x3, _x4, _x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}(); // var passwordValidator = Match.OneOf(
//   String,
//   { digest: String, algorithm: String }
// );


function validateOptions(options) {
  if ((0, _typeof2["default"])(options) != "object") {
    throw new Error();
  }

  if (options.username && typeof options.username != 'string') {
    throw new Error();
  }

  if (options.email && typeof options.email != 'string') {
    throw new Error();
  }

  if (options.password) {
    if ((0, _typeof2["default"])(options.password) == 'object') {
      if (typeof options.password.digest != 'string' || typeof options.password.algorithm != 'string') {
        throw new Error();
      }
    } else if (typeof options.password != 'string') {
      throw new Error();
    }
  }
}

function createUser(_x7) {
  return _createUser.apply(this, arguments);
}

function _createUser() {
  _createUser = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee3(options) {
    var username, email, user, hashed, userId;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            // Unknown keys allowed, because a onCreateUserHook can take arbitrary
            // options.
            validateOptions(options); // removing '@share911/meteor-error' from dependencies to avoid conflicts with Lambda/Optimize
            // check(options, Match.ObjectIncluding({
            //   username: Match.Optional(String),
            //   email: Match.Optional(String),
            //   password: Match.Optional(passwordValidator)
            // }));

            username = options.username;
            email = options.email;

            if (!(!username && !email)) {
              _context3.next = 5;
              break;
            }

            throw new Meteor.Error(400, "Need to set a username or email");

          case 5:
            user = {
              services: {}
            };

            if (!options.password) {
              _context3.next = 11;
              break;
            }

            _context3.next = 9;
            return hashPassword(options.password);

          case 9:
            hashed = _context3.sent;
            user.services.password = {
              bcrypt: hashed
            };

          case 11:
            if (username) user.username = username;
            if (email) user.emails = [{
              address: email,
              verified: false
            }];

            if (!(options.checkForDuplicates !== false)) {
              _context3.next = 18;
              break;
            }

            _context3.next = 16;
            return checkForCaseInsensitiveDuplicates({
              db: options.db
            }, 'username', 'Username', username);

          case 16:
            _context3.next = 18;
            return checkForCaseInsensitiveDuplicates({
              db: options.db
            }, 'emails.address', 'Email', email);

          case 18:
            _context3.next = 20;
            return insertUserDoc({
              db: options.db
            }, options, user);

          case 20:
            userId = _context3.sent;

            if (!(options.checkForDuplicates !== false)) {
              _context3.next = 34;
              break;
            }

            _context3.prev = 22;
            _context3.next = 25;
            return checkForCaseInsensitiveDuplicates({
              db: options.db
            }, 'username', 'Username', username, userId);

          case 25:
            _context3.next = 27;
            return checkForCaseInsensitiveDuplicates({
              db: options.db
            }, 'emails.address', 'Email', email, userId);

          case 27:
            _context3.next = 34;
            break;

          case 29:
            _context3.prev = 29;
            _context3.t0 = _context3["catch"](22);
            _context3.next = 33;
            return options.db.collection('users').remove({
              _id: userId
            });

          case 33:
            throw _context3.t0;

          case 34:
            return _context3.abrupt("return", userId);

          case 35:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3, null, [[22, 29]]);
  }));
  return _createUser.apply(this, arguments);
}

function insertUserDoc(_x8, _x9, _x10) {
  return _insertUserDoc.apply(this, arguments);
}

function _insertUserDoc() {
  _insertUserDoc = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee4(_ref4, options, user) {
    var db, fullUser, userId;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            db = _ref4.db;
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
              _context4.next = 4;
              break;
            }

            throw new Error('user.services is not supported in the node.js version');

          case 4:
            if (this && this._onCreateUserHook) {
              fullUser = this._onCreateUserHook(options, user); // This is *not* part of the API. We need this because we can't isolate
              // the global server environment between tests, meaning we can't test
              // both having a create user hook set and not having one set.

              if (fullUser === 'TEST DEFAULT HOOK') fullUser = defaultCreateUserHook(options, user);
            } else {
              fullUser = defaultCreateUserHook(options, user);
            }

            _underscore._.each(this && this._validateNewUserHooks, function (hook) {
              if (!hook(fullUser)) throw new Meteor.Error(403, "User validation failed");
            });

            _context4.prev = 6;
            _context4.next = 9;
            return db.collection('users').insertOne(fullUser);

          case 9:
            userId = _context4.sent.insertedId;
            _context4.next = 23;
            break;

          case 12:
            _context4.prev = 12;
            _context4.t0 = _context4["catch"](6);

            if (!(_context4.t0.name !== 'MongoError')) {
              _context4.next = 16;
              break;
            }

            throw _context4.t0;

          case 16:
            if (!(_context4.t0.code !== 11000)) {
              _context4.next = 18;
              break;
            }

            throw _context4.t0;

          case 18:
            if (!(_context4.t0.errmsg.indexOf('emails.address') !== -1)) {
              _context4.next = 20;
              break;
            }

            throw new Meteor.Error(403, "Email already exists.");

          case 20:
            if (!(_context4.t0.errmsg.indexOf('username') !== -1)) {
              _context4.next = 22;
              break;
            }

            throw new Meteor.Error(403, "Username already exists.");

          case 22:
            throw _context4.t0;

          case 23:
            return _context4.abrupt("return", userId);

          case 24:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4, this, [[6, 12]]);
  }));
  return _insertUserDoc.apply(this, arguments);
}

function defaultCreateUserHook(options, user) {
  if (options.profile) user.profile = options.profile;
  return user;
}

var Accounts = {
  createUser: createUser,
  hashPassword: hashPassword
};
exports.Accounts = Accounts;