import 'dotenv/config'
import { validate } from '../validation/validate'

const errors: string[] = []

function read(key: string, fallback?: string): string | undefined {
    const raw = process.env[key]
    return raw === undefined || raw === '' ? fallback : raw
}

function str(key: string, fallback?: string): string {
    const raw = read(key, fallback)
    const error = validate(raw)
        .required(`${key} — majburiy, .env faylga qo'shing`)
        .isString(`${key} — matn bo'lishi kerak`)
        .error()

    if (error) {
        errors.push(error)
        return ''
    }
    return raw as string
}

function optionalStr(key: string, fallback = ''): string {
    return read(key, fallback) ?? ''
}

function num(key: string, fallback?: number): number {
    const raw = read(key)
    const parsed = raw === undefined ? fallback : Number(raw)
    const error = validate(parsed)
        .required(`${key} — majburiy, .env faylga qo'shing`)
        .isNumber(`${key} — son bo'lishi kerak (hozir: "${raw}")`)
        .error()

    if (error) {
        errors.push(error)
        return 0
    }
    return parsed as number
}

function oneOf(key: string, allowed: readonly string[], fallback: string): string {
    const raw = read(key, fallback) as string
    const error = validate(raw)
        .oneOf(allowed, `${key} — quyidagilardan biri bo'lishi kerak: ${allowed.join(', ')}`)
        .error()

    if (error) {
        errors.push(error)
        return fallback
    }
    return raw
}

export class Env {
    static readonly NODE_ENV = oneOf('NODE_ENV', ['dev', 'prod', 'test'], 'dev')
    static readonly PORT = num('PORT', 3000)

    static readonly DB_HOST = str('DB_HOST', 'localhost')
    static readonly DB_PORT = num('DB_PORT', 5432)
    static readonly DB_USER = str('DB_USER')
    static readonly DB_PASSWORD = optionalStr('DB_PASSWORD')
    static readonly DB_NAME = str('DB_NAME')

    static readonly CORS_ORIGIN = str('CORS_ORIGIN', '*')

    static get isProd(): boolean {
        return Env.NODE_ENV === 'prod'
    }

    static get corsOrigins(): string | string[] {
        if (Env.CORS_ORIGIN === '*') return '*'
        return Env.CORS_ORIGIN.split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
    }

    static get dbTarget(): string {
        return `${Env.DB_USER}@${Env.DB_HOST}:${Env.DB_PORT}/${Env.DB_NAME}`
    }
}

if (errors.length > 0) {
    console.error("\n❌ .env sozlamalarida xatolik:\n")
    for (const error of errors) {
        console.error(`   • ${error}`)
    }
    console.error("\n   Namunadan nusxa oling:  cp .env.example .env\n")
    process.exit(1)
}
