import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { Pool, PoolClient, QueryResultRow } from 'pg'
import { Env } from '../config/env'

/**
 * Baza bilan ishlash. Global — istalgan service'ga inject qilinadi:
 *
 *   constructor(private readonly db: DatabaseService) {}
 *
 *   const users = await this.db.query<User>('SELECT * FROM users WHERE age > $1', [18])
 *   const user  = await this.db.queryOne<User>('SELECT * FROM users WHERE id = $1', [id])
 *
 * Har doim $1, $2 ... parametrlaridan foydalaning — SQL injection'dan himoya.
 */

/** Bir vaqtda ochiq turadigan ulanishlar soni. */
const POOL_MAX = 10

/** Bo'sh turgan ulanish shuncha ms dan keyin yopiladi. */
const IDLE_TIMEOUT_MS = 30_000

/** Ulanishni shuncha ms kutamiz, keyin xato. 0 bo'lsa — cheksiz kutadi (xavfli). */
const CONNECTION_TIMEOUT_MS = 10_000

@Injectable()
export class DatabaseService implements OnModuleDestroy {
    private readonly logger = new Logger(DatabaseService.name)

    readonly pool = new Pool({
        host: Env.DB_HOST,
        port: Env.DB_PORT,
        user: Env.DB_USER,
        password: Env.DB_PASSWORD || undefined,
        database: Env.DB_NAME,
        max: POOL_MAX,
        idleTimeoutMillis: IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    })

    constructor() {
        // MUHIM: bu tinglovchisiz bo'sh turgan ulanishdagi xato (baza qayta
        // ishga tushdi, tarmoq uzildi) uncaught exception bo'lib, butun
        // dasturni o'ldiradi. pool o'zi zararlangan ulanishni almashtiradi.
        this.pool.on('error', (error) => {
            this.logger.error(`Pool xatosi: ${error.message}`)
        })
    }

    /** Qatorlar ro'yxatini qaytaradi. */
    async query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
        const result = await this.pool.query<T>(sql, params)
        return result.rows
    }

    /** Birinchi qator yoki null. */
    async queryOne<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
        const rows = await this.query<T>(sql, params)
        return rows[0] ?? null
    }

    /**
     * Tranzaksiya. Callback xato tashlasa — hammasi bekor qilinadi.
     *
     *   await this.db.transaction(async client => {
     *       await client.query('INSERT INTO ...', [...])
     *       await client.query('UPDATE ...', [...])
     *   })
     */
    async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect()
        try {
            await client.query('BEGIN')
            const result = await work(client)
            await client.query('COMMIT')
            return result
        } catch (error) {
            // ROLLBACK ning o'zi ham xato berishi mumkin (ulanish uzilgan bo'lsa).
            // Uni yutamiz — aks holda asl xato yo'qoladi.
            try {
                await client.query('ROLLBACK')
            } catch (rollbackError) {
                const message =
                    rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
                this.logger.error(`ROLLBACK bajarilmadi: ${message}`)
            }
            throw error
        } finally {
            client.release()
        }
    }

    /** Ulanishni tekshiradi. Ulanmasa xato tashlaydi. */
    async checkConnection(): Promise<void> {
        await this.pool.query('SELECT 1')
    }

    /** Dastur to'xtaganda pool yopiladi. */
    async onModuleDestroy(): Promise<void> {
        await this.pool.end()
        this.logger.log('Baza ulanishi yopildi')
    }
}
