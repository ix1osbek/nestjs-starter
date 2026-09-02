/**
 * Oddiy, zanjirli (chainable) validator.
 *
 *   validate(email).required("Email majburiy").isEmail("Email noto'g'ri")
 *
 * Qoida: birinchi xatodan keyin qolgan tekshiruvlar o'tkazib yuboriladi.
 * Ya'ni bitta qiymat uchun bitta xato — xabarlar takrorlanmaydi.
 *
 * `to*` metodlari qiymatni tekshiribgina qolmay, TURINI HAM o'zgartiradi
 * (query va param'da hamma narsa matn bo'lib keladi — "25" ni 25 ga aylantirish
 * kerak). Yakuniy qiymatni value() qaytaradi.
 *
 * Yangi qoida qo'shish uchun quyidagi qolipdan nusxa oling:
 *
 *   isPositive(message: string): this {
 *       if (this.stopped) return this
 *       if (typeof this._value !== 'number' || this._value <= 0) return this.fail(message)
 *       return this
 *   }
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class Validator {
    private readonly _errors: string[] = []
    private stopped = false

    constructor(private _value: unknown) {}

    /** Xatoni yozib qo'yadi va keyingi tekshiruvlarni to'xtatadi. */
    private fail(message: string): this {
        this._errors.push(message)
        this.stopped = true
        return this
    }

    /** Qiymat bo'sh bo'lmasligi kerak (undefined, null, '' — bo'sh hisoblanadi). */
    required(message: string): this {
        if (this.stopped) return this
        if (this._value === undefined || this._value === null || this._value === '') {
            return this.fail(message)
        }
        return this
    }

    /**
     * Qiymat ixtiyoriy: bo'sh bo'lsa qolgan tekshiruvlar o'tkazib yuboriladi,
     * xato ham qo'shilmaydi. Zanjirning eng boshida yoziladi.
     */
    optional(): this {
        if (this.stopped) return this
        if (this._value === undefined || this._value === null || this._value === '') {
            this.stopped = true
        }
        return this
    }

    isString(message: string): this {
        if (this.stopped) return this
        if (typeof this._value !== 'string') return this.fail(message)
        return this
    }

    isNumber(message: string): this {
        if (this.stopped) return this
        if (typeof this._value !== 'number' || Number.isNaN(this._value)) return this.fail(message)
        return this
    }

    isInt(message: string): this {
        if (this.stopped) return this
        if (typeof this._value !== 'number' || !Number.isInteger(this._value)) return this.fail(message)
        return this
    }

    isBoolean(message: string): this {
        if (this.stopped) return this
        if (typeof this._value !== 'boolean') return this.fail(message)
        return this
    }

    isArray(message: string): this {
        if (this.stopped) return this
        if (!Array.isArray(this._value)) return this.fail(message)
        return this
    }

    isEmail(message: string): this {
        if (this.stopped) return this
        if (typeof this._value !== 'string' || !EMAIL_PATTERN.test(this._value)) return this.fail(message)
        return this
    }

    /**
     * Matnni songa aylantiradi: "25" -> 25. Query va param uchun.
     * Qiymat allaqachon son bo'lsa — shundayligicha qoladi.
     */
    toNumber(message: string): this {
        if (this.stopped) return this
        if (typeof this._value === 'number') return this.isNumber(message)
        if (typeof this._value !== 'string' || this._value.trim() === '') return this.fail(message)

        const parsed = Number(this._value)
        if (Number.isNaN(parsed)) return this.fail(message)

        this._value = parsed
        return this
    }

    /** toNumber + butun son bo'lishi shart: "25" -> 25, "2.5" -> xato. */
    toInt(message: string): this {
        if (this.stopped) return this
        this.toNumber(message)
        if (this.stopped) return this
        if (!Number.isInteger(this._value as number)) return this.fail(message)
        return this
    }

    /** "true"/"1" -> true, "false"/"0" -> false. */
    toBoolean(message: string): this {
        if (this.stopped) return this
        if (typeof this._value === 'boolean') return this
        if (this._value === 'true' || this._value === '1') {
            this._value = true
            return this
        }
        if (this._value === 'false' || this._value === '0') {
            this._value = false
            return this
        }
        return this.fail(message)
    }

    /** Matn uchun — boshi va oxiridagi bo'sh joylarni olib tashlaydi. */
    trim(): this {
        if (this.stopped) return this
        if (typeof this._value === 'string') this._value = this._value.trim()
        return this
    }

    /** Matn yoki massiv uchun eng kam uzunlik. */
    minLength(min: number, message: string): this {
        if (this.stopped) return this
        if (!hasLength(this._value) || this._value.length < min) return this.fail(message)
        return this
    }

    /** Matn yoki massiv uchun eng ko'p uzunlik. */
    maxLength(max: number, message: string): this {
        if (this.stopped) return this
        if (!hasLength(this._value) || this._value.length > max) return this.fail(message)
        return this
    }

    minValue(min: number, message: string): this {
        if (this.stopped) return this
        if (typeof this._value !== 'number' || Number.isNaN(this._value) || this._value < min) {
            return this.fail(message)
        }
        return this
    }

    maxValue(max: number, message: string): this {
        if (this.stopped) return this
        if (typeof this._value !== 'number' || Number.isNaN(this._value) || this._value > max) {
            return this.fail(message)
        }
        return this
    }

    pattern(regex: RegExp, message: string): this {
        if (this.stopped) return this
        if (typeof this._value !== 'string' || !regex.test(this._value)) return this.fail(message)
        return this
    }

    /** Qiymat ruxsat etilgan ro'yxatdan bo'lishi kerak. */
    oneOf(allowed: readonly unknown[], message: string): this {
        if (this.stopped) return this
        if (!allowed.includes(this._value)) return this.fail(message)
        return this
    }

    /** O'zingizning tekshiruvingiz: true qaytsa — to'g'ri. */
    custom(check: (value: unknown) => boolean, message: string): this {
        if (this.stopped) return this
        if (!check(this._value)) return this.fail(message)
        return this
    }

    /** Tekshiruvdan keyingi qiymat — `to*` metodlari uni o'zgartirgan bo'lishi mumkin. */
    value(): unknown {
        return this._value
    }

    /** Barcha xatolar (nusxa). */
    errors(): string[] {
        return [...this._errors]
    }

    /** Birinchi xato yoki null. */
    error(): string | null {
        return this._errors[0] ?? null
    }

    isValid(): boolean {
        return this._errors.length === 0
    }
}

function hasLength(value: unknown): value is string | unknown[] {
    return typeof value === 'string' || Array.isArray(value)
}

export function validate(value: unknown): Validator {
    return new Validator(value)
}

/** Bitta maydon uchun qoida. */
export type Rule = (v: Validator) => Validator

/** Obyekt qoidalari: maydon nomi -> qoida. */
export type Rules = Record<string, Rule>

export interface ValidationResult<T = Record<string, unknown>> {
    /** Maydon nomi -> xabarlar. Xato bo'lmasa — bo'sh obyekt. */
    errors: Record<string, string[]>
    /** FAQAT `rules` da e'lon qilingan maydonlar, turi to'g'rilangan holda. */
    data: T
    isValid: boolean
}

/**
 * Butun obyektni tekshiradi va HAMMA maydon xatolarini qaytaradi.
 *
 * Natijadagi `data` — oq ro'yxat: `rules` da yozilmagan maydonlar TASHLAB
 * YUBORILADI. Ya'ni tashqaridan kelgan ortiqcha maydon ichkariga o'tmaydi.
 *
 *   validateObject(body, {
 *       email: v => v.required('Email majburiy').isEmail("Email noto'g'ri"),
 *       age:   v => v.optional().toInt("Yosh butun son bo'lsin"),
 *   })
 *   // -> { errors: { email: ["Email noto'g'ri"] }, data: { age: 25 }, isValid: false }
 */
export function validateObject<T = Record<string, unknown>>(
    input: unknown,
    rules: Rules,
): ValidationResult<T> {
    const source = (input ?? {}) as Record<string, unknown>
    const errors: Record<string, string[]> = {}
    const data: Record<string, unknown> = {}

    for (const [field, rule] of Object.entries(rules)) {
        const validator = rule(validate(source[field]))
        const fieldErrors = validator.errors()

        if (fieldErrors.length > 0) {
            errors[field] = fieldErrors
            continue
        }

        const value = validator.value()
        if (value !== undefined) {
            data[field] = value
        }
    }

    return { errors, data: data as T, isValid: Object.keys(errors).length === 0 }
}
