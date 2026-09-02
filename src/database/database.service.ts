import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { Pool, PoolClient, QueryResultRow } from 'pg'
import { Env } from '../config/env'

const POOL_MAX = 10

const IDLE_TIMEOUT_MS = 30_000

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
        this.pool.on('error', (error) => {
            this.logger.error(`Pool xatosi: ${error.message}`)
        })
    }

    async query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
        const result = await this.pool.query<T>(sql, params)
        return result.rows
    }

    async queryOne<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
        const rows = await this.query<T>(sql, params)
        return rows[0] ?? null
    }

    async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect()
        try {
            await client.query('BEGIN')
            const result = await work(client)
            await client.query('COMMIT')
            return result
        } catch (error) {
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

    async checkConnection(): Promise<void> {
        await this.pool.query('SELECT 1')
    }

    async onModuleDestroy(): Promise<void> {
        await this.pool.end()
        this.logger.log('Baza ulanishi yopildi')
    }
}
