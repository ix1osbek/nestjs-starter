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

export function getPagination(query: PageQuery, maxLimit: number = MAX_LIMIT): Pagination {
    const page = Math.max(1, Math.floor(Number(query.page)) || 1)
    const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(query.limit)) || DEFAULT_LIMIT))

    return { page, limit, offset: (page - 1) * limit }
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
    return {
        items,
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    }
}
