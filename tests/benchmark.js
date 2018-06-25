import { Accounts } from '../src/index.js'
import { MongoClient } from 'mongodb'

async function test() {
  const client = await MongoClient.connect('mongodb://localhost:27017')
  const db = await client.db('accounts')

  const promises = []

  for (let i = 1; i <= 10000; i += 1) {
    promises.push(Accounts.createUser({
      username: 'Test' + i,
      email: `test${i}@example.com`,
      password: 'password',
      db
    }))
  }

  await Promise.all(promises)
}

test().then(
  error => {
    console.error(error)
    process.exit(1)
  },
  result => {
    if (result) console.log(result)
    process.exit(0)
  }
)
