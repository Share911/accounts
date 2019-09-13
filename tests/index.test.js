import { validateOptions } from '../src/index.js'


test('throws error if options is not an object', () => {
  const options = 'options'
  expect(() => validateOptions(options)).toThrow(Error);
});

test('doesn\'t throw error if options is an empty object', () => {
  const options = {}
  expect(() => validateOptions(options)).not.toThrow(Error);
});

test('throws error if options.email is not a string', () => {
  const options = {
    email: ['me@gmail.com']
  }
  expect(() => validateOptions(options)).toThrow(Error);
});

test('throws error if options.username is not a string', () => {
  const options = {
    email: ['me@gmail.com']
  }
  expect(() => validateOptions(options)).toThrow(Error);
});

test('throws error if options.password is not a string', () => {
  const options = {
    password: ['top-secret']
  }
  expect(() => validateOptions(options)).toThrow(Error);
});

test('throws error if options.password.digest is not a string', () => {
  const options = {
    password: {
      digest: [43, 24, 34, 324]
    }
  }
  expect(() => validateOptions(options)).toThrow(Error);
});

test('throws error if options.password.digest is correct but algorithm is missing', () => {
  const options = {
    password: {
      digest: 'sha384'
    }
  }
  expect(() => validateOptions(options)).toThrow(Error);
});

test('doesn\'t throw error if options has correct types', () => {
  const options = {
    username: 'john',
    email: 'john@gmail.com',
    password: 'top-secret'
  }
  expect(() => validateOptions(options)).not.toThrow(Error);
});

test('doesn\'t throw error if options has correct types 2', () => {
  const options = {
    username: 'john',
    email: 'john@gmail.com',
    password: {
      digest: '1234',
      algorithm: 'sha384'
    }
  }
  expect(() => validateOptions(options)).not.toThrow(Error);
});


test('doesn\'t throw error if options has correct types and missing values', () => {
  const options = {
    username: 'john',
    password: {
      digest: '1234',
      algorithm: 'sha384'
    }
  }
  expect(() => validateOptions(options)).not.toThrow(Error);
});