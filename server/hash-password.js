// Usage: ADMIN_PASSWORD='your password' node server/hash-password.js
import crypto from 'node:crypto'

const password = process.env.ADMIN_PASSWORD
if (!password) {
  console.error('Set ADMIN_PASSWORD in the environment.')
  process.exit(1)
}
const salt = crypto.randomBytes(16)
const hash = crypto.scryptSync(password, salt, 64)
console.log(`scrypt$${salt.toString('hex')}$${hash.toString('hex')}`)
