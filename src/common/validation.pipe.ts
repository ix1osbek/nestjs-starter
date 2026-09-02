import { ArgumentMetadata, HttpStatus, Injectable, PipeTransform, Type } from '@nestjs/common'
import { Rules, validateObject } from '../validation/validate'
import { AppException, ValidationException } from './app.exception'

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
