import { argon2id, argon2Verify } from 'hash-wasm'
import { randomBytes } from 'node:crypto'

const ARGON2_MEMORY = 65536
const ARGON2_ITERATIONS = 3
const ARGON2_PARALLELISM = 1
const ARGON2_HASH_LENGTH = 32
const SALT_LENGTH = 16

/** PHC-encoded argon2id hash (hash-wasm). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  return argon2id({
    password,
    salt,
    parallelism: ARGON2_PARALLELISM,
    iterations: ARGON2_ITERATIONS,
    memorySize: ARGON2_MEMORY,
    hashLength: ARGON2_HASH_LENGTH,
    outputType: 'encoded',
  })
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  try {
    return await argon2Verify({
      password,
      hash: encodedHash,
    })
  } catch {
    return false
  }
}
