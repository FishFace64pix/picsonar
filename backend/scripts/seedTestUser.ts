/**
 * Idempotent local test-user seed.
 *
 * Inserts (or upserts) a known user into the dev USERS_TABLE so you can
 * skip the /register flow every time you want to poke the app. Keyed by
 * email so re-running rotates the password but keeps the same userId.
 *
 * Usage:
 *   AWS_REGION=eu-central-1 STAGE=dev \
 *   npx ts-node backend/scripts/seedTestUser.ts
 *
 * or from the repo root:
 *   npm run seed:test-user
 *
 * Reads the standard backend .env so it picks up USERS_TABLE automatically.
 *
 * NEVER RUN AGAINST PRODUCTION. Guarded by STAGE check.
 */
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'

import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import bcrypt from 'bcryptjs'

// --- load backend/.env if present (tiny hand-rolled parser so we don't
// force an extra devDep just for a one-off script) ---
try {
  const envPath = resolve(__dirname, '..', '.env')
  const raw = readFileSync(envPath, 'utf8')
  raw.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  })
} catch {
  // no .env — fine, maybe env vars are already set
}

const STAGE = process.env.STAGE ?? 'dev'
const AWS_REGION = process.env.AWS_REGION ?? 'eu-central-1'
const USERS_TABLE =
  process.env.USERS_TABLE ?? `eventfacematch-users-${STAGE}`

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? 'test@local.dev'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'Test1234!'
const TEST_NAME = process.env.TEST_USER_NAME ?? 'Local Dev User'

if (STAGE === 'prod' || STAGE === 'production') {
  console.error(
    '[seed] refusing to run against STAGE=prod — this is a LOCAL dev helper',
  )
  process.exit(2)
}

async function main() {
  const client = new DynamoDBClient({ region: AWS_REGION })

  // Look up existing user by email (email-index GSI)
  const existing = await client.send(
    new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: marshall({ ':email': TEST_EMAIL }),
    }),
  )

  const userId =
    existing.Items && existing.Items.length
      ? (unmarshall(existing.Items[0]).userId as string)
      : randomUUID()

  const now = new Date().toISOString()
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12)

  const user = {
    userId,
    email: TEST_EMAIL,
    name: TEST_NAME,
    phone: '+40700000000',
    role: 'user' as const,
    password: passwordHash,
    createdAt:
      existing.Items && existing.Items.length
        ? (unmarshall(existing.Items[0]).createdAt as string) ?? now
        : now,
    updatedAt: now,
    acceptedTermsAt: now,
    acceptedPrivacyAt: now,
    acceptedDpaAt: now,
    acceptedImmediateDeliveryAt: now,
    legalAudit: {
      ip: '127.0.0.1',
      userAgent: 'seedTestUser.ts',
      termsVersion: '1.0',
      privacyVersion: '1.0',
      dpaVersion: '1.0',
      immediateDeliveryVersion: '1.0',
    },
    plan: 'starter',
    eventCredits: 10,
    subscriptionStatus: 'inactive',
  }

  await client.send(
    new PutItemCommand({
      TableName: USERS_TABLE,
      Item: marshall(user, { removeUndefinedValues: true }),
    }),
  )

  console.log('[seed] ✔ test user upserted')
  console.log(`  table:    ${USERS_TABLE}`)
  console.log(`  email:    ${TEST_EMAIL}`)
  console.log(`  password: ${TEST_PASSWORD}`)
  console.log(`  userId:   ${userId}`)
  console.log(
    '\nLog in at http://localhost:5173/login — creds above.\n' +
      'Override via TEST_USER_EMAIL / TEST_USER_PASSWORD env vars.',
  )
}

main().catch((err) => {
  console.error('[seed] failed', err)
  process.exit(1)
})
