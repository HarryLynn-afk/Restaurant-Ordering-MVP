// @vitest-environment node
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { beforeAll, afterAll, describe, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))

let testEnv

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'restaurant-ordering-app-1addc',
    storage: {
      rules: readFileSync(resolve(__dirname, '../storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

describe('storage.rules — slips/{userId}', () => {
  beforeAll(async () => {
    // Upload a test slip as admin (no rules) so read tests have a file to fetch
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(
        ref(ctx.storage(), 'slips/user-123/receipt.jpg'),
        new Uint8Array([0xff, 0xd8, 0xff]),
        { contentType: 'image/jpeg' }
      )
    })
  })

  it('owner can read their own slip', async () => {
    const ownerCtx = testEnv.authenticatedContext('user-123')
    await assertSucceeds(
      getDownloadURL(ref(ownerCtx.storage(), 'slips/user-123/receipt.jpg'))
    )
  })

  it('owner can upload their own slip', async () => {
    const ownerCtx = testEnv.authenticatedContext('user-123')
    await assertSucceeds(
      uploadBytes(
        ref(ownerCtx.storage(), 'slips/user-123/receipt2.jpg'),
        new Uint8Array([0xff, 0xd8, 0xff]),
        { contentType: 'image/jpeg' }
      )
    )
  })

  it('stranger (anonymous customer) cannot read another user slip', async () => {
    // Customers use anonymous sign-in; non-anonymous = staff in these rules
    const strangerCtx = testEnv.authenticatedContext('attacker-999', {
      firebase: { sign_in_provider: 'anonymous' },
    })
    await assertFails(
      getDownloadURL(ref(strangerCtx.storage(), 'slips/user-123/receipt.jpg'))
    )
  })

  it('unauthenticated user cannot read any slip', async () => {
    const anonCtx = testEnv.unauthenticatedContext()
    await assertFails(
      getDownloadURL(ref(anonCtx.storage(), 'slips/user-123/receipt.jpg'))
    )
  })

  it('staff can read any slip', async () => {
    // Staff = signed in with a non-anonymous provider (token.firebase.sign_in_provider != 'anonymous')
    const staffCtx = testEnv.authenticatedContext('staff-001', {
      firebase: { sign_in_provider: 'password' },
    })
    await assertSucceeds(
      getDownloadURL(ref(staffCtx.storage(), 'slips/user-123/receipt.jpg'))
    )
  })
})
