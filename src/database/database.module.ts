import { Global, Module } from '@nestjs/common'
import { DatabaseService } from './database.service'

/** Global — har bir modulda alohida import qilish shart emas. */
@Global()
@Module({
    providers: [DatabaseService],
    exports: [DatabaseService],
})
export class DatabaseModule {}
