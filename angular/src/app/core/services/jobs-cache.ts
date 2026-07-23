/**
 * In-memory jobs cache for the Angular JobFinder example.
 * Same behavior as the Vue/React example stores (framework-agnostic).
 */

export interface JobRecord {
  id?: string | number;
  [key: string]: unknown;
}

export interface CategoryRecord {
  id?: string | number;
  label?: string;
  slug?: string;
  [key: string]: unknown;
}

export interface ListQuery {
  page: number;
  perPage: number;
  search: string;
  category: string;
}

const LIST_TTL_MS = 5 * 60 * 1000;
const DETAIL_TTL_MS = 10 * 60 * 1000;
const CATEGORIES_TTL_MS = 30 * 60 * 1000;

const listInflight = new Map<string, Promise<{ jobs: JobRecord[]; total: number }>>();
const detailInflight = new Map<string, Promise<JobRecord>>();
let categoriesInflight: Promise<CategoryRecord[]> | null = null;

function listKey({ page, perPage, search, category }: ListQuery): string {
  return [page, perPage, search || '', category || ''].join('\0');
}

function isFresh(fetchedAt: number, ttlMs: number): boolean {
  return typeof fetchedAt === 'number' && Date.now() - fetchedAt < ttlMs;
}

export interface JobsCacheState {
  lists: Record<string, { jobs: JobRecord[]; total: number; fetchedAt: number }>;
  details: Record<string, { job: JobRecord; fetchedAt: number }>;
  categories: CategoryRecord[];
  categoriesError: string;
  categoriesFetchedAt: number;
}

export const state: JobsCacheState = {
  lists: Object.create(null) as Record<
    string,
    { jobs: JobRecord[]; total: number; fetchedAt: number }
  >,
  details: Object.create(null) as Record<string, { job: JobRecord; fetchedAt: number }>,
  categories: [],
  categoriesError: '',
  categoriesFetchedAt: 0,
};

export function getJobsState(): JobsCacheState {
  return state;
}

export function peekList(query: ListQuery): {
  jobs: JobRecord[];
  total: number;
  fresh: boolean;
} | null {
  const entry = state.lists[listKey(query)];
  if (!entry) return null;
  return {
    jobs: entry.jobs,
    total: entry.total,
    fresh: isFresh(entry.fetchedAt, LIST_TTL_MS),
  };
}

export function peekDetail(id: string | number | null | undefined): {
  job: JobRecord;
  fresh: boolean;
} | null {
  if (!id) return null;
  const entry = state.details[String(id)];
  if (!entry?.job) return null;
  return {
    job: entry.job,
    fresh: isFresh(entry.fetchedAt, DETAIL_TTL_MS),
  };
}

export function seedDetail(job: JobRecord | null | undefined): void {
  if (!job || typeof job !== 'object' || job.id == null) return;
  const id = String(job.id);
  const existing = state.details[id];
  if (existing && isFresh(existing.fetchedAt, DETAIL_TTL_MS)) return;
  state.details[id] = {
    job: existing?.job ? { ...existing.job, ...job } : { ...job },
    fetchedAt: existing?.fetchedAt || 0,
  };
}

async function fetchList(query: ListQuery): Promise<{ jobs: JobRecord[]; total: number }> {
  const params = new URLSearchParams({
    page: String(query.page),
    perPage: String(query.perPage),
  });
  if (query.search) params.set('search', query.search);
  if (query.category) params.set('category', query.category);

  const res = await fetch(`/api/jobs?${params}`);
  const body = (await res.json().catch(() => ({}))) as { message?: string; jobs?: unknown; total?: number };
  if (!res.ok) {
    throw new Error(body.message || `Request failed (${res.status})`);
  }

  const jobs = Array.isArray(body.jobs) ? (body.jobs as JobRecord[]) : [];
  const total = typeof body.total === 'number' ? body.total : 0;
  const key = listKey(query);
  state.lists[key] = { jobs, total, fetchedAt: Date.now() };

  for (const job of jobs) {
    seedDetail(job);
  }

  return { jobs, total };
}

export async function ensureList(
  query: ListQuery,
  { force = false }: { force?: boolean } = {}
): Promise<{ jobs: JobRecord[]; total: number; fromCache: boolean }> {
  const key = listKey(query);
  const cached = peekList(query);

  if (cached?.fresh && !force) {
    return { jobs: cached.jobs, total: cached.total, fromCache: true };
  }

  let pending = listInflight.get(key);
  if (!pending) {
    pending = fetchList(query).finally(() => listInflight.delete(key));
    listInflight.set(key, pending);
  }
  const result = await pending;
  return { ...result, fromCache: Boolean(cached) };
}

async function fetchDetail(id: string): Promise<JobRecord> {
  const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`);
  const body = (await res.json().catch(() => ({}))) as { message?: string; job?: unknown };
  if (!res.ok) {
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  const job = body.job && typeof body.job === 'object' ? (body.job as JobRecord) : null;
  if (!job) throw new Error('Job not found');
  state.details[id] = { job, fetchedAt: Date.now() };
  return job;
}

export async function ensureDetail(
  id: string | number,
  { force = false }: { force?: boolean } = {}
): Promise<{ job: JobRecord; fromCache: boolean }> {
  const key = String(id);
  const cached = peekDetail(key);

  if (cached?.fresh && !force) {
    return { job: cached.job, fromCache: true };
  }

  let pending = detailInflight.get(key);
  if (!pending) {
    pending = fetchDetail(key).finally(() => detailInflight.delete(key));
    detailInflight.set(key, pending);
  }
  const job = await pending;
  return { job, fromCache: Boolean(cached) };
}

export async function ensureCategories({ force = false }: { force?: boolean } = {}): Promise<CategoryRecord[]> {
  if (
    !force &&
    state.categories.length &&
    isFresh(state.categoriesFetchedAt, CATEGORIES_TTL_MS)
  ) {
    return state.categories;
  }

  if (!categoriesInflight) {
    categoriesInflight = fetchCategories().finally(() => {
      categoriesInflight = null;
    });
  }
  return categoriesInflight;
}

async function fetchCategories(): Promise<CategoryRecord[]> {
  state.categoriesError = '';
  try {
    const res = await fetch('/api/categories');
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      categories?: unknown;
    };
    if (!res.ok) {
      throw new Error(body.message || `Request failed (${res.status})`);
    }
    state.categories = Array.isArray(body.categories) ? (body.categories as CategoryRecord[]) : [];
    state.categoriesFetchedAt = Date.now();
    return state.categories;
  } catch (err) {
    if (!state.categories.length) {
      state.categoriesError =
        err instanceof Error ? err.message : 'Could not load categories';
    }
    throw err;
  }
}

/** Clears cache + in-flight maps. For unit tests only. */
export function resetJobsStoreForTests(): void {
  for (const key of Object.keys(state.lists)) delete state.lists[key];
  for (const key of Object.keys(state.details)) delete state.details[key];
  state.categories = [];
  state.categoriesError = '';
  state.categoriesFetchedAt = 0;
  listInflight.clear();
  detailInflight.clear();
  categoriesInflight = null;
}
