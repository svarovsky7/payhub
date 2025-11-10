import type { Letter, LetterStatus, Project, UserProfile } from '../lib/supabase'

interface LetterCache {
  letters: Letter[]
  letterStatuses: LetterStatus[]
  projects: Project[]
  users: UserProfile[]
}

let letterCache: LetterCache | null = null

export const getLetterCache = (): LetterCache | null => {
  return letterCache
}

export const setLetterCache = (cache: LetterCache): void => {
  letterCache = cache
}

export const addLetterToCache = (letter: Letter): void => {
  if (letterCache) {
    letterCache = {
      ...letterCache,
      letters: [letter, ...letterCache.letters]
    }
  }
}

export const updateLetterInCache = (letterId: string, updatedLetter: Letter): void => {
  if (letterCache) {
    letterCache = {
      ...letterCache,
      letters: letterCache.letters.map(letter => 
        letter.id === letterId ? updatedLetter : letter
      )
    }
  }
}

export const removeLetterFromCache = (letterId: string): void => {
  if (letterCache) {
    letterCache = {
      ...letterCache,
      letters: letterCache.letters.filter(letter => letter.id !== letterId)
    }
  }
}

export const clearLetterCache = (): void => {
  letterCache = null
}

