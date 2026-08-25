import {Pool} from 'pg'
import {Env} from '../config/env'

export const db = new Pool({
    host: Env.DB_HOST,
    port: Env.DB_PORT,
    user: Env.DB_USER,
    password: Env.DB_PASSWORD,
    database: Env.DB_NAME,
})

export async function checkPoolConnection() {
    try {
        const res = await db.query<{ now: Date }>(`SELECT NOW()`)
        console.log(`✅ Pool connection successful! Server time: ${res.rows[0].now.toISOString()}`)
    } catch (e) {
        console.error(`❌ Pool connection failed (${Env.DB_USER}@${Env.DB_HOST}:${Env.DB_PORT}/${Env.DB_NAME}):`, e.message)
    }
}
