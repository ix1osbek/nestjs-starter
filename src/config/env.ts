import 'dotenv/config'
import { validate } from '../validation/validate'

/**
 * .env dagi sozlamalar.
 *
 * Dastur ishga tushishida bir marta tekshiriladi. Biror majburiy qiymat
 * yetishmasa — server ko'tarilmaydi, konsolda aniq xabar chiqadi.
 *
 * Yangi sozlama qo'shish: quyidagi ro'yxatga bir qator qo'shing va
 * .env.example ni ham yangilang.
 */

const errors: string[] = []

/** Bo'sh qatorni "yozilmagan" deb hisoblaydi — shunda fallback ishlaydi. */
function read(key: string, fallback?: string): string | undefined {
    const raw = process.env[key]
    return raw === undefined || raw === '' ? fallback : raw
}

/** Majburiy matn. fallback berilsa — ixtiyoriy bo'lib qoladi. */
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

/** Ixtiyoriy matn — bo'sh bo'lishi ham mumkin, tekshirilmaydi. */
function optionalStr(key: string, fallback = ''): string {
    return read(key, fallback) ?? ''
}

/** Majburiy son. fallback berilsa — ixtiyoriy bo'lib qoladi. */
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

/** Ruxsat etilgan qiymatlardan biri. */
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
    /** Ixtiyoriy — parolsiz lokal Postgres (trust/peer auth) uchun bo'sh qoldiring. */
    static readonly DB_PASSWORD = optionalStr('DB_PASSWORD')
    static readonly DB_NAME = str('DB_NAME')

    /** Vergul bilan ajratilgan ro'yxat yoki `*` (hammasiga ruxsat). */
    static readonly CORS_ORIGIN = str('CORS_ORIGIN', '*')

    static get isProd(): boolean {
        return Env.NODE_ENV === 'prod'
    }

    /** CORS uchun tayyor qiymat: `*` yoki originlar ro'yxati. */
    static get corsOrigins(): string | string[] {
        if (Env.CORS_ORIGIN === '*') return '*'
        return Env.CORS_ORIGIN.split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
    }

    /** Loglarda ko'rsatish uchun — parolsiz. */
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
