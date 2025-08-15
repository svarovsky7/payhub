// Shared constants will be exported here
export const API_ENDPOINTS = {
  INVOICES: 'invoices',
  USERS: 'users',
  PROJECTS: 'projects',
  CONTRACTORS: 'contractors',
  PAYERS: 'payers',
} as const;

export const QUERY_KEYS = {
  INVOICES: ['invoices'],
  USERS: ['users'],
  PROJECTS: ['projects'],
  CONTRACTORS: ['contractors'],
  PAYERS: ['payers'],
} as const;