/**
 * Global cache for letters data to prevent unnecessary reloads
 */

import type { Letter, LetterStatus, Project, UserProfile } from '../lib/supabase'

interface LetterCache {
  letters: Letter[]
  letterStatuses: LetterStatus[]
  projects: Project[]
  users: UserProfile[]
  lastLoaded: number | null
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 минут

let globalCache: LetterCache = {
  letters: [],
  letterStatuses: [],
  projects: [],
  users: [],
  lastLoaded: null
}

export const getLetterCache = (): LetterCache | null => {
  if (!globalCache.lastLoaded) {
    console.log('[LetterCache] No cache available')
    return null
  }

  const now = Date.now()
  const age = now - globalCache.lastLoaded

  if (age > CACHE_DURATION) {
    console.log('[LetterCache] Cache expired', { ageMs: age })
    return null
  }

  console.log('[LetterCache] Returning cached data', {
    lettersCount: globalCache.letters.length,
    ageMs: age
  })

  return { ...globalCache }
}

export const setLetterCache = (cache: Omit<LetterCache, 'lastLoaded'>) => {
  console.log('[LetterCache] Setting cache', {
    lettersCount: cache.letters.length,
    statusesCount: cache.letterStatuses.length,
    projectsCount: cache.projects.length,
    usersCount: cache.users.length
  })

  globalCache = {
    ...cache,
    lastLoaded: Date.now()
  }
}

export const clearLetterCache = () => {
  console.log('[LetterCache] Clearing cache')
  globalCache = {
    letters: [],
    letterStatuses: [],
    projects: [],
    users: [],
    lastLoaded: null
  }
}

export const updateLetterInCache = (letterId: string, updatedLetter: Partial<Letter>) => {
  if (!globalCache.lastLoaded) return

  console.log('[LetterCache] Updating letter in cache', { letterId })

  const updateInTree = (lettersList: Letter[]): Letter[] => {
    return lettersList.map(letter => {
      if (letter.id === letterId) {
        return { ...letter, ...updatedLetter }
      }
      if (letter.children && letter.children.length > 0) {
        return {
          ...letter,
          children: updateInTree(letter.children)
        }
      }
      return letter
    })
  }

  globalCache.letters = updateInTree(globalCache.letters)
}

export const addLetterToCache = (newLetter: Letter) => {
  if (!globalCache.lastLoaded) return

  console.log('[LetterCache] Adding letter to cache', { letterId: newLetter.id })
  globalCache.letters = [newLetter, ...globalCache.letters]
}

export const removeLetterFromCache = (letterId: string) => {
  if (!globalCache.lastLoaded) return

  console.log('[LetterCache] Removing letter from cache', { letterId })

  const removeLetterFromTree = (lettersList: Letter[]): Letter[] => {
    return lettersList
      .filter(letter => letter.id !== letterId)
      .map(letter => {
        if (letter.children && letter.children.length > 0) {
          return {
            ...letter,
            children: removeLetterFromTree(letter.children)
          }
        }
        return letter
      })
  }

  globalCache.letters = removeLetterFromTree(globalCache.letters)
}

