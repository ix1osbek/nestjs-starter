class Validator {
    private _errors: string[] = []
    private stopped = false

    constructor(private readonly value: unknown) {
    }

    required(message: string): this {
        if (this.stopped) {
            return this
        }

        const valid =
            this.value !== undefined &&
            this.value !== null &&
            this.value !== ''

        if (!valid) {
            this._errors.push(message)
            this.stopped = true
        }

        return this
    }

    isString(message: string): this {
        if (this.stopped) {
            return this
        }

        if (typeof this.value !== 'string') {
            this._errors.push(message)
            this.stopped = true
        }

        return this
    }

    isNumber(message: string): this {
        if (this.stopped) {
            return this
        }

        if (typeof this.value !== 'number' || Number.isNaN(this.value)) {
            this._errors.push(message)
            this.stopped = true
        }

        return this
    }

    minLength(min: number, message: string): this {
        if (this.stopped) {
            return this
        }

        if (
            typeof this.value !== 'string' ||
            this.value.length < min
        ) {
            this._errors.push(message)
        }

        return this
    }

    maxLength(max: number, message: string): this {
        if (this.stopped) {
            return this
        }

        if (
            typeof this.value !== 'string' ||
            this.value.length > max
        ) {
            this._errors.push(message)
        }

        return this
    }

    minValue(min: number, message: string): this {
        if (this.stopped) {
            return this
        }

        if (
            typeof this.value !== 'number' ||
            Number.isNaN(this.value) ||
            this.value < min
        ) {
            this._errors.push(message)
        }

        return this
    }

    maxValue(max: number, message: string): this {
        if (this.stopped) {
            return this
        }

        if (
            typeof this.value !== 'number' ||
            Number.isNaN(this.value) ||
            this.value > max
        ) {
            this._errors.push(message)
        }

        return this
    }

    errors(): string[] {
        return this._errors
    }

    error(): string | null {
        return this._errors[0] || null
    }
}

export function validate(value: unknown): Validator {
    return new Validator(value)
}