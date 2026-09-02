/**
 * Sahifalash yordamchisi.
 *
 *   const { page, limit, offset } = getPagination(query)
 *   const items = await db.query('SELECT * FROM users LIMIT $1 OFFSET $2', [limit, offset])
 *   const [{ count }] = await db.query('SELECT COUNT(*)::int AS count FROM users')
 *   return paginate(items, count, page, limit)
 */

export interface PageQuery {
    page?: unknown
    limit?: unknown
}

export interface Pagination {
    page: number
    limit: number
    offset: number
}

export interface PaginatedResult<T> {
    items: T[]
    total: number
    page: number
    limit: number
    totalPages: number
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/** Query paramlardan xavfsiz page/limit/offset chiqaradi. */
export function getPagination(query: PageQuery, maxLimit: number = MAX_LIMIT): Pagination {
    const page = Math.max(1, Math.floor(Number(query.page)) || 1)
    const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(query.limit)) || DEFAULT_LIMIT))

    return { page, limit, offset: (page - 1) * limit }
}

/** Natijani sahifa ma'lumoti bilan o'raydi. */
export function paginate<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
    return {
        items,
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    }
}
