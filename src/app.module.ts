import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health/health.controller'

@Module({
    imports: [
        DatabaseModule,
        // Yangi modullaringizni shu yerga qo'shing
    ],
    controllers: [HealthController],
    providers: [],
})
export class AppModule {}
