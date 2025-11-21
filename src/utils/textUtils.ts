const INVISIBLE_CODEPOINTS = new Set([
  0x200b,
  0x200c,
  0x200d,
  0x200e,
  0x200f,
  0x202a,
  0x202b,
  0x202c,
  0x202d,
  0x202e,
  0xfeff,
])

const isControlCharacter = (code: number): boolean => {
  if (code <= 0x1f) return true
  if (code >= 0x7f && code <= 0x9f) return true
  return INVISIBLE_CODEPOINTS.has(code)
}

export const truncateText = (text: string, maxLength: number = 25): string => {
  if (!text) return '—'
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

export const stripInvisibleCharacters = (value: string): string => {
  if (!value) {
    return ''
  }

  return Array.from(value)
    .filter((char) => !isControlCharacter(char.charCodeAt(0)))
    .join('')
    .trim()
}

