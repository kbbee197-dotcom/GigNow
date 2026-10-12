import { Client, Account, TablesDB, Storage } from 'appwrite'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)

export const account = new Account(client)
export const tablesDB = new TablesDB(client)
export const storage = new Storage(client)
export const DB_ID = 'gignow'
export const SIGNATURES_TABLE = 'legal_signatures'
export const DOCS_TABLE = 'worker_documents'
export const DOCS_BUCKET = 'worker-docs'
export const JOBS_TABLE = 'jobs'
export const REVIEWS_TABLE = 'document_reviews'
export const APPS_TABLE = 'applications'
export const HIRES_TABLE = 'hires'
export const LOGS_TABLE = 'work_logs'
export const EMPLOYER_TABLE = 'employer_profiles'
export const EOR_TABLE = '6ac9a5d4001830da0b4f'
export const NOTIFS_TABLE = '6acc0a5f000cd80428e0'
export const PREFS_TABLE = '6acc1930001673ed260c'
export const MESSAGES_TABLE = '6acc1af3001982d10959'
export const COMMENTS_TABLE = '6acc1c2500289c4d562c'
export { client }
