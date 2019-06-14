import { _ } from 'underscore'
import { check, Match } from '@share911/meteor-check'
import * as Meteor from '@share911/meteor-error'
import bcrypt from 'bcrypt'
import { SHA256 } from '@share911/meteor-sha'
import { Random } from '@share911/meteor-random'

function _escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Given a 'password' from the client, extract the string that we should
// bcrypt. 'password' can be one of:
//  - String (the plaintext password)
//  - Object with 'digest' and 'algorithm' keys. 'algorithm' must be "sha-256".
//
var getPasswordString = function (password) {
  if (typeof password === "string") {
    password = SHA256(password);
  } else { // 'password' is an object
    if (password.algorithm !== "sha-256") {
      throw new Error("Invalid password hash algorithm. " +
        "Only 'sha-256' is allowed.");
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
var hashPassword = async function (password) {
  password = getPasswordString(password);
  return await bcrypt.hash(password, 10);
};

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
var selectorForFastCaseInsensitiveLookup = function (fieldName, string) {
  // Performance seems to improve up to 4 prefix characters
  var prefix = string.substring(0, Math.min(string.length, 4));
  var orClause = _.map(generateCasePermutationsForString(prefix),
    function (prefixPermutation) {
      var selector = {};
      selector[fieldName] =
        new RegExp('^' + _escapeRegExp(prefixPermutation));
      return selector;
    });
  var caseInsensitiveClause = {};
  caseInsensitiveClause[fieldName] =
    new RegExp('^' + _escapeRegExp(string) + '$', 'i')
  return {$and: [{$or: orClause}, caseInsensitiveClause]};
}

// Generates permutations of all case variations of a given string.
var generateCasePermutationsForString = function (string) {
  var permutations = [''];
  for (var i = 0; i < string.length; i++) {
    var ch = string.charAt(i);
    permutations = _.flatten(_.map(permutations, function (prefix) {
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
}

var checkForCaseInsensitiveDuplicates = async function ({db}, fieldName, displayName, fieldValue, ownUserId) {
  // Some tests need the ability to add users with the same case insensitive
  // value, hence the _skipCaseInsensitiveChecksForTest check
  var skipCheck = _.has(Accounts._skipCaseInsensitiveChecksForTest, fieldValue);

  if (fieldValue && !skipCheck) {
    var matchedUsers = await db.collection('users').find(
      selectorForFastCaseInsensitiveLookup(fieldName, fieldValue)).toArray();

    if (matchedUsers.length > 0 &&
      // If we don't have a userId yet, any match we find is a duplicate
      (!ownUserId ||
      // Otherwise, check to see if there are multiple matches or a match
      // that is not us
      (matchedUsers.length > 1 || matchedUsers[0]._id !== ownUserId))) {
      throw new Meteor.Error(403, displayName + " already exists.");
    }
  }
};

var passwordValidator = Match.OneOf(
  String,
  { digest: String, algorithm: String }
);

async function createUser(options) {
  // Unknown keys allowed, because a onCreateUserHook can take arbitrary
  // options.
  check(options, Match.ObjectIncluding({
    username: Match.Optional(String),
    email: Match.Optional(String),
    password: Match.Optional(passwordValidator)
  }));

  var username = options.username;
  var email = options.email;
  if (!username && !email)
    throw new Meteor.Error(400, "Need to set a username or email");

  var user = {services: {}};
  if (options.password) {
    var hashed = await hashPassword(options.password);
    user.services.password = { bcrypt: hashed };
  }

  if (username)
    user.username = username;
  if (email)
    user.emails = [{address: email, verified: false}];

  if (options.checkForDuplicates !== false) {
    // Perform a case insensitive check before insert
    await checkForCaseInsensitiveDuplicates({db: options.db}, 'username', 'Username', username);
    await checkForCaseInsensitiveDuplicates({db: options.db}, 'emails.address', 'Email', email);
  }

  var userId = await insertUserDoc({db: options.db}, options, user);

  if (options.checkForDuplicates !== false) {
    // Perform another check after insert, in case a matching user has been
    // inserted in the meantime
    try {
      await checkForCaseInsensitiveDuplicates({db: options.db}, 'username', 'Username', username, userId);
      await checkForCaseInsensitiveDuplicates({db: options.db}, 'emails.address', 'Email', email, userId);
    } catch (ex) {
      // Remove inserted user if the check fails
      await options.db.collection('users').remove({_id: userId});
      throw ex;
    }
  }

  return userId;
}

async function insertUserDoc({db}, options, user) {
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
  user = _.extend({
    createdAt: new Date(),
    _id: Random.id()
  }, user);

  if (user.services && user.services.length > 0) {
    throw new Error('user.services is not supported in the node.js version')
  }

  var fullUser;
  if (this && this._onCreateUserHook) {
    fullUser = this._onCreateUserHook(options, user);

    // This is *not* part of the API. We need this because we can't isolate
    // the global server environment between tests, meaning we can't test
    // both having a create user hook set and not having one set.
    if (fullUser === 'TEST DEFAULT HOOK')
      fullUser = defaultCreateUserHook(options, user);
  } else {
    fullUser = defaultCreateUserHook(options, user);
  }

  _.each(this && this._validateNewUserHooks, function (hook) {
    if (! hook(fullUser))
      throw new Meteor.Error(403, "User validation failed");
  });

  var userId;
  try {
    userId = (await db.collection('users').insertOne(fullUser)).insertedId;
  } catch (e) {
    // XXX string parsing sucks, maybe
    // https://jira.mongodb.org/browse/SERVER-3069 will get fixed one day
    if (e.name !== 'MongoError') throw e;
    if (e.code !== 11000) throw e;
    if (e.errmsg.indexOf('emails.address') !== -1)
      throw new Meteor.Error(403, "Email already exists.");
    if (e.errmsg.indexOf('username') !== -1)
      throw new Meteor.Error(403, "Username already exists.");
    // XXX better error reporting for services.facebook.id duplicate, etc
    throw e;
  }
  return userId;
}

function defaultCreateUserHook(options, user) {
  if (options.profile)
    user.profile = options.profile;
  return user;
}

export const Accounts = {
  createUser
}
