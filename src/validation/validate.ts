const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class Validator {
    private readonly _errors: string[] = []
    private stopped = false

    constructor(private _value: unknown) {}

    private fail(message: string): this {
        this._errors.push(message)
        this.stopped = true
        return this
    }

    required(message: string): this {
        if (this.stopped) return this
        if (this._value === undefined || this._value === null || this._value === '') {
            return this.fail(message)
        }
        return this
    }

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

    toNumber(message: string): this {
        if (this.stopped) return this
        if (typeof this._value === 'number') return this.isNumber(message)
        if (typeof this._value !== 'string' || this._value.trim() === '') return this.fail(message)

        const parsed = Number(this._value)
        if (Number.isNaN(parsed)) return this.fail(message)

        this._value = parsed
        return this
    }

    toInt(message: string): this {
        if (this.stopped) return this
        this.toNumber(message)
        if (this.stopped) return this
        if (!Number.isInteger(this._value as number)) return this.fail(message)
        return this
    }

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

    trim(): this {
        if (this.stopped) return this
        if (typeof this._value === 'string') this._value = this._value.trim()
        return this
    }

    minLength(min: number, message: string): this {
        if (this.stopped) return this
        if (!hasLength(this._value) || this._value.length < min) return this.fail(message)
        return this
    }

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

    oneOf(allowed: readonly unknown[], message: string): this {
        if (this.stopped) return this
        if (!allowed.includes(this._value)) return this.fail(message)
        return this
    }

    custom(check: (value: unknown) => boolean, message: string): this {
        if (this.stopped) return this
        if (!check(this._value)) return this.fail(message)
        return this
    }

    value(): unknown {
        return this._value
    }

    errors(): string[] {
        return [...this._errors]
    }

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

export type Rule = (v: Validator) => Validator

export type Rules = Record<string, Rule>

export interface ValidationResult<T = Record<string, unknown>> {
    errors: Record<string, string[]>
    data: T
    isValid: boolean
}

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
