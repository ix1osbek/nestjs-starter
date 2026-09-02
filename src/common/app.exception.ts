import { HttpException, HttpStatus } from '@nestjs/common'

export class AppException extends HttpException {
    constructor(
        message: string,
        status: HttpStatus = HttpStatus.BAD_REQUEST,
        readonly errors?: Record<string, string[]>,
    ) {
        super(message, status)
    }
}

export class ValidationException extends AppException {
    constructor(errors: Record<string, string[]>) {
        super("Ma'lumotlar noto'g'ri", HttpStatus.BAD_REQUEST, errors)
    }
}
