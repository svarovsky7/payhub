import type { Letter } from '../lib/supabase'

let letterCache: Letter[] | null = null

export const getLetterCache = (): Letter[] | null => {
  return letterCache
}

export const setLetterCache = (letters: Letter[]): void => {
  letterCache = letters
}

export const addLetterToCache = (letter: Letter): void => {
  if (letterCache) {
    letterCache = [letter, ...letterCache]
  }
}

export const updateLetterInCache = (letterId: number, updatedLetter: Letter): void => {
  if (letterCache) {
    letterCache = letterCache.map(letter => 
      letter.id === letterId ? updatedLetter : letter
    )
  }
}

export const removeLetterFromCache = (letterId: number): void => {
  if (letterCache) {
    letterCache = letterCache.filter(letter => letter.id !== letterId)
  }
}

export const clearLetterCache = (): void => {
  letterCache = null
}

