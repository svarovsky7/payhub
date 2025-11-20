const BASE64_URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const TOKEN_LENGTH = 16
const BITS_PER_CHAR = 6
const REQUIRED_BITS = TOKEN_LENGTH * BITS_PER_CHAR
const BYTE_LENGTH = Math.ceil(REQUIRED_BITS / 8)

const toBitString = (bytes: Uint8Array): string => {
  let bits = ''
  bytes.forEach(byte => {
    bits += byte.toString(2).padStart(8, '0')
  })
  return bits
}

const fallbackRandom = (): Uint8Array => {
  const bytes = new Uint8Array(BYTE_LENGTH)
  for (let i = 0; i < BYTE_LENGTH; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

export const generateShareToken = (): string => {
  const bytes =
    typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
      ? crypto.getRandomValues(new Uint8Array(BYTE_LENGTH))
      : fallbackRandom()

  let bitString = toBitString(bytes)

  if (bitString.length < REQUIRED_BITS) {
    const extraBytes = fallbackRandom()
    bitString += toBitString(extraBytes)
  }

  bitString = bitString.slice(0, REQUIRED_BITS)

  let token = ''
  for (let i = 0; i < REQUIRED_BITS; i += BITS_PER_CHAR) {
    const chunk = bitString.slice(i, i + BITS_PER_CHAR)
    const index = parseInt(chunk, 2)
    token += BASE64_URL_ALPHABET[index]
  }

  return token
}

