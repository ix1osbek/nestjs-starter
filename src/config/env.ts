import 'dotenv/config'

export class Env {
    public static readonly NODE_ENV: string =
        process.env.NODE_ENV || 'dev'

    public static readonly PORT: number =
        Number(process.env.PORT) || 3000

    public static readonly DB_HOST: string =
        process.env.DB_HOST || 'localhost'

    public static readonly DB_PORT: number =
        Number(process.env.DB_PORT) || 5432

    public static readonly DB_USER: string =
        process.env.DB_USER || 'postgres'

    public static readonly DB_PASSWORD: string =
        process.env.DB_PASSWORD || ''

    public static readonly DB_NAME: string =
        process.env.DB_NAME || ''
}
