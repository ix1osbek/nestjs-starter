import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { AppException } from './app.exception'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('Exception')

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp()
        const request = ctx.getRequest<Request>()
        const response = ctx.getResponse<Response>()

        let status = HttpStatus.INTERNAL_SERVER_ERROR
        let message = 'Serverda kutilmagan xatolik'
        let errors: Record<string, string[]> | undefined

        if (exception instanceof AppException) {
            status = exception.getStatus()
            message = exception.message
            errors = exception.errors
        } else if (exception instanceof HttpException) {
            status = exception.getStatus()
            message = extractMessage(exception)
        } else {
            this.logger.error(
                exception instanceof Error ? exception.message : String(exception),
                exception instanceof Error ? exception.stack : undefined,
            )
        }

        response.status(status).json({
            statusCode: status,
            message,
            ...(errors ? { errors } : {}),
            path: request.url,
            timestamp: new Date().toISOString(),
        })
    }
}

function extractMessage(exception: HttpException): string {
    const body = exception.getResponse()

    if (typeof body === 'string') {
        return body
    }

    const message = (body as { message?: unknown }).message
    if (Array.isArray(message)) {
        return message.join(', ')
    }
    if (typeof message === 'string') {
        return message
    }
    return exception.message
}
