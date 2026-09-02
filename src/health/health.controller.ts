import { Controller, Get, HttpStatus, Res } from '@nestjs/common'
import type { Response } from 'express'
import { DatabaseService } from '../database/database.service'
import { Env } from '../config/env'

@Controller('health')
export class HealthController {
    constructor(private readonly db: DatabaseService) {}

    @Get()
    async check(@Res({ passthrough: true }) res: Response) {
        let database = 'ok'
        try {
            await this.db.checkConnection()
        } catch {
            database = 'down'
        }

        const healthy = database === 'ok'
        res.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)

        return {
            status: healthy ? 'ok' : 'degraded',
            env: Env.NODE_ENV,
            database,
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        }
    }
}
