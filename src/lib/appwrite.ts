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
export { client }
