import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module'
import {Env} from './config/env'
import {checkPoolConnection} from "./database/database";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(Env.PORT, () => {
        console.log(`Server started on port ${Env.PORT}`)
    })
    checkPoolConnection()
}

bootstrap();
