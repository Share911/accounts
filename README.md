# accounts

NPM port of some accounts-base and accounts-password functionality.
Compatible with AWS Lambda.

Install package:

```
npm i @share911/accounts
```

Use package:

```
import { Accounts } from '@share911/accounts'

Accounts.createUser(...)
Accounts.hashPassword(...)
```

How to publish the package to NPM (after you bump version):

```
npm login
npm publish
```
