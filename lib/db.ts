import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create a reusable SQL query function
export const sql = neon(process.env.DATABASE_URL)
