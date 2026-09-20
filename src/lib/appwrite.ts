import { Client, Account, TablesDB } from 'appwrite'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)

export const account = new Account(client)
export const tablesDB = new TablesDB(client)
export const DB_ID = 'gignow'
export const SIGNATURES_TABLE = 'legal_signatures'
export { client }
