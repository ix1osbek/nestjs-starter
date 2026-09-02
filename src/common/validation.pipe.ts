import { ArgumentMetadata, HttpStatus, Injectable, PipeTransform, Type } from '@nestjs/common'
import { Rules, validateObject } from '../validation/validate'
import { AppException, ValidationException } from './app.exception'

/**
 * DTO klassidagi `rules` ni avtomatik ishlatadi.
 *
 *   export class CreateUserDto {
 *       static rules: Rules = {
 *           email: v => v.required('Email majburiy').isEmail("Email noto'g'ri"),
 *           age:   v => v.optional().toInt("Yosh butun son bo'lsin"),
 *       }
 *
 *       email!: string
 *       age?: number
 *   }
 *
 *   @Post()
 *   create(@Body() dto: CreateUserDto) { ... }   // shu yerda o'zi tekshiriladi
 *
 * Pipe uchta ish qiladi:
 *   1. tekshiradi — xato bo'lsa 400 qaytadi, controller'ga yetib bormaydi
 *   2. tozalaydi  — `rules` da yo'q maydonlar tashlab yuboriladi (mass-assignment'dan himoya)
 *   3. turlantiradi — natija DTO klassining haqiqiy nusxasi bo'ladi
 *
 * `rules` yozilmagan DTO tekshirilmasdan o'tadi.
 * Shu sababli DTO klassi argumentsiz `new` bo'la olishi kerak (konstruktorsiz).
 *
 * Bundan tashqari `@Param('id') id: number` kabi oddiy turlarni matndan
 * songa/boolean'ga o'giradi — query va param'da hamma narsa matn bo'lib keladi.
 */
@Injectable()
export class ValidationPipe implements PipeTransform {
    transform(value: unknown, metadata: ArgumentMetadata): unknown {
        const metatype = metadata.metatype as (Type & { rules?: Rules }) | undefined
        if (!metatype) {
            return value
        }

        if (metatype === Number || metatype === Boolean) {
            return coercePrimitive(value, metatype, metadata)
        }

        const rules = metatype.rules
        if (!rules) {
            return value
        }

        const { errors, data, isValid } = validateObject(value, rules)
        if (!isValid) {
            throw new ValidationException(errors)
        }

        return Object.assign(new metatype(), data)
    }
}

/** "5" -> 5, "true" -> true. Query/param'da hamma narsa matn bo'lib keladi. */
function coercePrimitive(value: unknown, metatype: unknown, metadata: ArgumentMetadata): unknown {
    if (typeof value !== 'string') {
        return value
    }

    const name = metadata.data ?? 'Qiymat'

    if (metatype === Number) {
        const parsed = Number(value)
        if (value.trim() === '' || Number.isNaN(parsed)) {
            throw new AppException(`${name} — son bo'lishi kerak`, HttpStatus.BAD_REQUEST)
        }
        return parsed
    }

    if (value === 'true' || value === '1') return true
    if (value === 'false' || value === '0') return false
    throw new AppException(`${name} — true yoki false bo'lishi kerak`, HttpStatus.BAD_REQUEST)
}
