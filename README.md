# NestJS Starter

Har qanday yangi NestJS loyihasini shu yerdan boshlash uchun qolip.
ORM yo'q — sof `pg` va oddiy SQL.

## Boshlash

```bash
npm i
cp .env.example .env      # to'ldiring
npm run migrate           # baza jadvallari
npm run start:dev
```

Server: `http://localhost:PORT/api` · Tekshirish: `GET /api/health`
(baza yotgan bo'lsa **503** qaytadi — load balancer shunga qarab ish tutadi)

## Skriptlar

| Buyruq | Nima qiladi |
|---|---|
| `npm run start:dev` | Watch rejimida ishga tushiradi |
| `npm run migrate` | Yangi migratsiyalarni qo'llaydi (dev) |
| `npm run migrate:prod` | Migratsiya, `dist/` dan — serverda `build` dan keyin |
| `npm run build` | `dist/` ga kompilyatsiya |
| `npm run start:prod` | Kompilyatsiya qilingan versiyani ishga tushiradi |

## Tuzilma

```
src/
  common/       xatolar, global filter, validatsiya pipe, sahifalash
  config/       env.ts — .env sozlamalari
  database/     DatabaseService + migratsiya
  health/       /api/health
  validation/   validate.ts — validator
```

## Migratsiya

`src/database/migrations/` ichiga `.sql` fayl qo'shing — nom tartibida bajariladi:

```sql
-- src/database/migrations/001_create_users.sql
CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```bash
npm run migrate        # dev
npm run migrate:prod   # serverda, `npm run build` dan keyin
```

Avval qo'llanganlari o'tkazib yuboriladi, faqat yangilari ishlaydi. Har bir fayl
alohida tranzaksiyada — xato bo'lsa o'sha fayl butunlay bekor qilinadi va jarayon
to'xtaydi.

Butun jarayon Postgres advisory lock ostida: bir nechta instance bir vaqtda deploy
bo'lsa, ular navbat bilan ishlaydi — bitta migratsiya ikki marta qo'llanmaydi.

`.sql` fayllar `build` paytida `dist/` ga nusxalanadi (`nest-cli.json` → `assets`),
shuning uchun prod serverda `src/` va `ts-node` kerak emas.

> Qo'llangan faylni **o'zgartirmang** — yangisini qo'shing. Qaysilari qo'llangani
> bazadagi `migrations` jadvalida turadi.

## Baza bilan ishlash

`DatabaseService` global — istalgan joyda inject qilinadi:

```ts
@Injectable()
export class UsersService {
    constructor(private readonly db: DatabaseService) {}

    findAll() {
        return this.db.query<User>('SELECT * FROM users')
    }

    findOne(id: number) {
        return this.db.queryOne<User>('SELECT * FROM users WHERE id = $1', [id])
    }

    createWithProfile(email: string) {
        return this.db.transaction(async (client) => {
            const { rows } = await client.query('INSERT INTO users (email) VALUES ($1) RETURNING id', [email])
            await client.query('INSERT INTO profiles (user_id) VALUES ($1)', [rows[0].id])
            return rows[0]
        })
    }
}
```

Har doim `$1, $2 ...` parametrlaridan foydalaning — SQL injection'dan himoya.

## Validatsiya

DTO klassiga `static rules` yozing — global pipe o'zi tekshiradi:

```ts
export class CreateUserDto {
    static rules: Rules = {
        email: (v) => v.required('Email majburiy').isEmail("Email noto'g'ri"),
        name:  (v) => v.required('Ism majburiy').trim().minLength(2, 'Juda qisqa'),
        age:   (v) => v.optional().toInt('Butun son bo\'lsin').minValue(18, '18 dan katta bo\'lsin'),
    }

    email!: string
    name!: string
    age?: number
}

@Post()
create(@Body() dto: CreateUserDto) { ... }   // xato bo'lsa bu yergacha yetib kelmaydi
```

Pipe uch ish qiladi:

1. **Tekshiradi** — xato bo'lsa 400, controller'ga yetib bormaydi.
2. **Tozalaydi** — `rules` da yozilmagan maydon **tashlab yuboriladi**. Ya'ni
   `{email, name, isAdmin: true}` yuborilsa, `isAdmin` DTO'ga o'tmaydi
   (mass-assignment'dan himoya). `rules` — oq ro'yxat.
3. **Turlantiradi** — natija DTO klassining haqiqiy nusxasi (`instanceof` ishlaydi).
   Shuning uchun DTO argumentsiz `new` bo'la olishi kerak — konstruktor yozmang.

### Turlar: `is*` va `to*` farqi

Query va param'da **hamma narsa matn** bo'lib keladi — `?age=25` da qiymat `"25"`.
Shuning uchun:

| Manba | Ishlating |
|---|---|
| `@Body()` (JSON) | `isInt`, `isNumber`, `isBoolean` — tur allaqachon to'g'ri |
| `@Query()`, `@Param()` | `toInt`, `toNumber`, `toBoolean` — matndan o'giradi |

`to*` qiymatni tekshiribgina qolmay, **o'zgartiradi** ham: `"25"` → `25`.
Ikkilansangiz `to*` ni tanlang — u tayyor son kelsa ham ishlayveradi.

Oddiy turlar o'zi o'giriladi — `@Param('id') id: number` da `id` haqiqatan `number`:

```ts
@Get(':id')
findOne(@Param('id') id: number) { ... }   // "5" -> 5, "abc" -> 400
```

Mavjud qoidalar:

- tekshirish: `required` · `optional` · `isString` · `isNumber` · `isInt` ·
  `isBoolean` · `isArray` · `isEmail` · `minLength` · `maxLength` · `minValue` ·
  `maxValue` · `pattern` · `oneOf` · `custom`
- o'girish: `toInt` · `toNumber` · `toBoolean` · `trim`

Yangi qoida kerak bo'lsa — `src/validation/validate.ts` dagi `Validator` klassiga
metod qo'shing (fayl boshida qolip bor).

## Xatolar

Barcha xatolar bitta formatda qaytadi:

```json
{
  "statusCode": 400,
  "message": "Ma'lumotlar noto'g'ri",
  "errors": { "email": ["Email noto'g'ri"] },
  "path": "/api/users",
  "timestamp": "2026-08-26T10:00:00.000Z"
}
```

Muvaffaqiyatli javob o'ralmaydi — controller nima qaytarsa, o'sha ketadi.

O'zingiz xato tashlash:

```ts
throw new AppException('Foydalanuvchi topilmadi', HttpStatus.NOT_FOUND)
```

Kutilmagan xatolarda mijozga faqat umumiy xabar boradi, to'liq stack logga yoziladi.

## Sahifalash

```ts
@Get()
async findAll(@Query() query: PageQuery) {
    const { page, limit, offset } = getPagination(query)
    const items = await this.db.query<User>('SELECT * FROM users LIMIT $1 OFFSET $2', [limit, offset])
    const row = await this.db.queryOne<{ count: number }>('SELECT COUNT(*)::int AS count FROM users')
    return paginate(items, row?.count ?? 0, page, limit)
}
```

## Yangi sozlama qo'shish

`src/config/env.ts` ga bir qator qo'shing va `.env.example` ni yangilang:

```ts
static readonly REDIS_URL = str('REDIS_URL')                  // majburiy
static readonly CACHE_TTL = num('CACHE_TTL', 60)              // ixtiyoriy, standart 60
static readonly SENTRY_DSN = optionalStr('SENTRY_DSN')        // bo'sh bo'lsa ham mayli
```

Majburiy sozlama yetishmasa, server ko'tarilmaydi — konsolda barcha yetishmayotgan
qiymatlar ro'yxati chiqadi.

## CORS

`.env` dagi `CORS_ORIGIN` boshqaradi:

```ini
CORS_ORIGIN=*                                          # hammasiga ruxsat (dev)
CORS_ORIGIN=https://example.com,https://app.example.com # prod
```

Aniq originlar yozilganda `credentials: true` yoqiladi (cookie/auth uzatiladi).
`*` da yoqilmaydi — brauzer bu kombinatsiyani baribir rad etadi. Prod'da `*`
qolib ketsa, ishga tushishda ogohlantirish chiqadi.

## Ishga tushish tartibi

1. `.env` tekshiriladi — xato bo'lsa dastur to'xtaydi
2. Bazaga ulanish tekshiriladi — ulanmasa server ko'tarilmaydi
3. Server tinglay boshlaydi
4. `Ctrl+C` / `SIGTERM` da baza ulanishi tartibli yopiladi
