import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Loyihaning umumiy xatosi.
 *
 *   throw new AppException('Foydalanuvchi topilmadi', HttpStatus.NOT_FOUND)
 *
 * Nest'ning o'z xatolari (NotFoundException va h.k.) ham ishlayveradi —
 * global filter ikkalasini ham bir xil formatga soladi.
 */
export class AppException extends HttpException {
    constructor(
        message: string,
        status: HttpStatus = HttpStatus.BAD_REQUEST,
        readonly errors?: Record<string, string[]>,
    ) {
        super(message, status)
    }
}

/** Validatsiya xatosi — maydonlar bo'yicha xabarlar bilan. */
export class ValidationException extends AppException {
    constructor(errors: Record<string, string[]>) {
        super("Ma'lumotlar noto'g'ri", HttpStatus.BAD_REQUEST, errors)
    }
}
