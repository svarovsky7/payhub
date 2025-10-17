/**
 * Letter Operations Service
 *
 * This service has been split into modules for better maintainability:
 * - letterLoading.ts: Loading letters, statuses, and queries
 * - letterRegistration.ts: Registration number generation
 * - letterCrud.ts: Create, Read, Update, Delete operations
 * - letterFiles.ts: File attachment management
 * - letterLinks.ts: Parent-child letter linking
 *
 * All functions are re-exported from this file for backward compatibility.
 */

// Loading operations
export {
  loadLetterStatuses,
  loadLetters,
  getLetterById
} from './letter/letterLoading'

// Registration number generation
export {
  generateRegNumber
} from './letter/letterRegistration'

// CRUD operations
export {
  createLetter,
  updateLetter,
  deleteLetter
} from './letter/letterCrud'

// File operations
export {
  processLetterFiles,
  getLetterAttachments
} from './letter/letterFiles'

// Letter linking
export {
  getParentLetters,
  getChildLetters,
  linkLetters,
  unlinkLetters
} from './letter/letterLinks'
