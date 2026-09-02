import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Pool, PoolClient } from 'pg'
import { Env } from '../config/env'

const MIGRATIONS_DIR = join(__dirname, 'migrations')

const LOCK_ID = 4_242_424_242

const pool = new Pool({
    host: Env.DB_HOST,
    port: Env.DB_PORT,
    user: Env.DB_USER,
    password: Env.DB_PASSWORD || undefined,
    database: Env.DB_NAME,
    connectionTimeoutMillis: 10_000,
})

pool.on('error', (error) => console.error(`   ⚠️  Pool xatosi: ${error.message}`))

async function main(): Promise<void> {
    console.log('\n🚀 Migratsiya')
    console.log(`   Baza: ${Env.dbTarget}\n`)

    await withLock(async () => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id         SERIAL PRIMARY KEY,
                name       TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        const files = readMigrationFiles()
        const applied = await readAppliedNames()
        const pending = files.filter((file) => !applied.has(file))

        console.log(`   Jami fayl:  ${files.length}`)
        console.log(`   Qo'llangan: ${applied.size}`)
        console.log(`   Yangi:      ${pending.length}\n`)

        if (files.length === 0) {
            console.log('   migrations/ papkasi bo\'sh. Fayl qo\'shing: 001_create_users.sql\n')
            return
        }

        if (pending.length === 0) {
            console.log('✨ Hammasi joyida — yangi migratsiya yo\'q\n')
            return
        }

        for (const name of pending) {
            await apply(name)
        }

        console.log(`\n🎉 Tayyor — ${pending.length} ta migratsiya qo'llandi\n`)
    })
}

async function withLock(work: () => Promise<void>): Promise<void> {
    const client: PoolClient = await pool.connect()
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID])

    try {
        await work()
    } finally {
        try {
            await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID])
        } catch {}
        client.release()
    }
}

function readMigrationFiles(): string[] {
    if (!existsSync(MIGRATIONS_DIR)) {
        return []
    }
    return readdirSync(MIGRATIONS_DIR)
        .filter((name) => name.endsWith('.sql'))
        .sort()
}

async function readAppliedNames(): Promise<Set<string>> {
    const result = await pool.query<{ name: string }>('SELECT name FROM migrations')
    return new Set(result.rows.map((row) => row.name))
}

async function apply(name: string): Promise<void> {
    const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8')
    const client = await pool.connect()
    const startedAt = Date.now()

    try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [name])
        await client.query('COMMIT')
        console.log(`   ✅ ${name}  (${Date.now() - startedAt}ms)`)
    } catch (error) {
        try {
            await client.query('ROLLBACK')
        } catch {}
        console.error(`   ❌ ${name}  — bekor qilindi`)
        console.error(`      ${error instanceof Error ? error.message : String(error)}\n`)
        throw error
    } finally {
        client.release()
    }
}

main()
    .catch(() => {
        console.error('💥 Migratsiya to\'xtadi. Yuqoridagi xatoni tuzatib, qayta ishga tushiring.\n')
        process.exitCode = 1
    })
    .finally(() => pool.end())
