import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/http-exception.filter'
import { ValidationPipe } from './common/validation.pipe'
import { Env } from './config/env'
import { DatabaseService } from './database/database.service'

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap')
    const app = await NestFactory.create(AppModule)

    const origin = Env.corsOrigins
    if (Env.isProd && origin === '*') {
        logger.warn('CORS hamma originga ochiq. Prod uchun .env da CORS_ORIGIN ni belgilang.')
    }

    app.setGlobalPrefix('api')
    app.enableCors({ origin, credentials: origin !== '*' })
    app.useGlobalPipes(new ValidationPipe())
    app.useGlobalFilters(new HttpExceptionFilter())
    app.enableShutdownHooks()

    const db = app.get(DatabaseService)
    try {
        await db.checkConnection()
        logger.log(`Bazaga ulanildi — ${Env.dbTarget}`)
    } catch (error) {
        logger.error(`Bazaga ulanib bo'lmadi — ${Env.dbTarget}`)
        logger.error(error instanceof Error ? error.message : String(error))
        await app.close()
        process.exit(1)
    }

    await app.listen(Env.PORT)
    logger.log(`Server tayyor — http://localhost:${Env.PORT}/api  [${Env.NODE_ENV}]`)
}

bootstrap()
