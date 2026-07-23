import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { CategoryRecord, JobRecord } from '../../core/services/jobs-cache';
import { JobsStoreService } from '../../core/services/jobs-store.service';
import {
  formatDateTime,
  formatDetailValue,
  formatRichText,
  formatSalaryDisplay,
  humanizeLabel,
  jobBoxPublicUrl,
} from '../../core/utils/format';

const PER_PAGE = 24;
const CATEGORY_PREVIEW_COUNT = 2;

const OVERVIEW_FIELDS: [string, string][] = [
  ['location', 'Location'],
  ['country_code', 'Country'],
  ['category', 'Category'],
  ['work_mode', 'Work mode'],
  ['seniority_level', 'Seniority'],
  ['employment_type', 'Employment'],
  ['compensation_type', 'Compensation'],
  ['salary_range', 'Salary'],
  ['currency', 'Currency'],
  ['status', 'Status'],
];

const TIMELINE_FIELDS: [string, string][] = [
  ['created_at', 'Created'],
  ['updated_at', 'Updated'],
];

const HUMANIZE_KEYS = new Set([
  'work_mode',
  'employment_type',
  'seniority_level',
  'compensation_type',
  'status',
  'category',
]);

export type PhIconSlug =
  | 'wifi-high'
  | 'arrows-split'
  | 'building-office'
  | 'buildings'
  | 'map-pin'
  | 'globe'
  | 'tag'
  | 'trend-up'
  | 'clock'
  | 'clock-user'
  | 'signature'
  | 'graduation-cap'
  | 'handshake'
  | 'hourglass'
  | 'briefcase'
  | 'money'
  | 'wallet'
  | 'coins'
  | 'check-circle'
  | 'calendar-blank'
  | 'arrows-clockwise';

interface DetailRow {
  key: string;
  label: string;
  value: string;
  icon: PhIconSlug;
}

interface JobBadge {
  key: string;
  text: string;
  icon: PhIconSlug | null;
  value: string;
}

function workModeIconSlug(value: unknown): PhIconSlug {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'remote') return 'wifi-high';
  if (v === 'hybrid') return 'arrows-split';
  if (v === 'onsite' || v === 'on_site' || v === 'on-site') return 'building-office';
  return 'buildings';
}

function employmentTypeIconSlug(value: unknown): PhIconSlug {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'full_time' || v === 'full-time') return 'clock';
  if (v === 'part_time' || v === 'part-time') return 'clock-user';
  if (v === 'contract') return 'signature';
  if (v === 'internship') return 'graduation-cap';
  if (v === 'freelance') return 'handshake';
  if (v === 'temporary') return 'hourglass';
  return 'briefcase';
}

function overviewFieldIconSlug(key: string, value: unknown): PhIconSlug {
  switch (key) {
    case 'location':
      return 'map-pin';
    case 'country_code':
      return 'globe';
    case 'category':
      return 'tag';
    case 'work_mode':
      return workModeIconSlug(value);
    case 'seniority_level':
      return 'trend-up';
    case 'employment_type':
      return employmentTypeIconSlug(value);
    case 'compensation_type':
      return 'money';
    case 'salary_range':
      return 'wallet';
    case 'currency':
      return 'coins';
    case 'status':
      return 'check-circle';
    default:
      return 'briefcase';
  }
}

function timelineFieldIconSlug(key: string): PhIconSlug {
  switch (key) {
    case 'created_at':
      return 'calendar-blank';
    case 'updated_at':
      return 'arrows-clockwise';
    default:
      return 'clock';
  }
}

function jobTitle(job: JobRecord | null | undefined): string {
  return String(job?.['title'] ?? 'Untitled role');
}

function jobCompany(job: JobRecord | null | undefined): string {
  return String(job?.['company'] ?? job?.['company_name'] ?? 'Company');
}

function jobLogo(job: JobRecord | null | undefined): string {
  const url = job?.['company_logo_url'];
  return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : '';
}

function jobBadges(job: JobRecord | null | undefined): JobBadge[] {
  if (!job || typeof job !== 'object') return [];
  const badges: JobBadge[] = [];
  const push = (value: unknown, key: string) => {
    if (value == null || value === '') return;
    const text = humanizeLabel(value);
    if (!text || badges.some((b) => b.text.toLowerCase() === text.toLowerCase())) return;
    badges.push({
      key,
      text,
      icon: key === 'work_mode' ? workModeIconSlug(value) : null,
      value: String(value),
    });
  };
  push(job['work_mode'], 'work_mode');
  push(job['employment_type'], 'employment_type');
  push(job['seniority_level'], 'seniority_level');
  push(job['compensation_type'], 'compensation_type');
  push(job['category'], 'category');
  push(job['location'], 'location');
  return badges.slice(0, 5);
}

function jobSnippet(job: JobRecord | null | undefined): string {
  const raw = job?.['summary'] ?? job?.['description'] ?? '';
  if (typeof raw !== 'string' || !raw.trim()) return '';
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryLabel(item: CategoryRecord): string {
  return String(item.label ?? item.slug ?? item.id ?? '');
}

function categorySlug(item: CategoryRecord): string {
  return String(item.slug ?? item.label ?? '');
}

function buildDetailFacts(job: JobRecord | null | undefined): DetailRow[] {
  if (!job || typeof job !== 'object') return [];
  const rows: DetailRow[] = [];
  const salaryText = job['salary_range'];
  const currencyCode =
    typeof job['currency'] === 'string' && job['currency'].trim()
      ? job['currency'].trim().toUpperCase()
      : '';

  for (const [key, label] of OVERVIEW_FIELDS) {
    if (key === 'currency') {
      if (salaryText != null && salaryText !== '') continue;
      if (!currencyCode) continue;
      rows.push({
        key,
        label,
        value: currencyCode,
        icon: overviewFieldIconSlug(key, currencyCode),
      });
      continue;
    }

    const value = job[key];
    if (value == null || value === '') continue;
    let display = HUMANIZE_KEYS.has(key) ? humanizeLabel(value) : formatDetailValue(value);

    if (key === 'salary_range') {
      display = formatSalaryDisplay(display, currencyCode);
    }

    rows.push({
      key,
      label,
      value: display,
      icon: overviewFieldIconSlug(key, value),
    });
  }
  return rows;
}

function buildDetailTimeline(job: JobRecord | null | undefined): DetailRow[] {
  if (!job || typeof job !== 'object') return [];
  const rows: DetailRow[] = [];
  for (const [key, label] of TIMELINE_FIELDS) {
    const value = job[key];
    if (value == null || value === '') continue;
    rows.push({
      key,
      label,
      value: formatDateTime(value),
      icon: timelineFieldIconSlug(key),
    });
  }
  return rows;
}

function buildDetailDescriptionHtml(job: JobRecord | null | undefined): string {
  if (!job) return '';
  const html = job['description_html'] ?? job['descriptionHtml'];
  if (typeof html === 'string' && html.trim()) return html;
  const text = job['description'] ?? job['summary'];
  if (typeof text === 'string' && text.trim()) return formatRichText(text);
  return '';
}

function buildDetailRequirementsHtml(job: JobRecord | null | undefined): string {
  const text = job?.['requirements'];
  if (typeof text !== 'string' || !text.trim()) return '';
  return formatRichText(text);
}

@Component({
  selector: 'app-jobs-page',
  standalone: true,
  imports: [PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './jobs-page.component.html',
  styles: `:host { display: block; }`,
})
export class JobsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly jobsStore = inject(JobsStoreService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  private listRequestId = 0;
  private detailRequestId = 0;
  private selectedIdRef = '';

  readonly perPage = PER_PAGE;
  readonly listSkeletonKeys = Array.from({ length: PER_PAGE }, (_, i) => `skel-${i}`);

  readonly routeData = toSignal(this.route.data, {
    initialValue: {} as Record<string, unknown>,
  });

  readonly lockedCategory = computed(() =>
    String(this.routeData()['lockedCategory'] ?? '').trim()
  );
  readonly showCategoryFilters = computed(() => !this.lockedCategory());
  readonly pageTitle = computed(() => String(this.routeData()['title'] ?? 'All Jobs'));

  readonly search = signal('');
  readonly category = signal('');
  readonly page = signal(1);
  readonly jobs = signal<JobRecord[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly refreshing = signal(false);
  readonly error = signal('');
  readonly debouncedSearch = signal('');
  readonly categoriesExpanded = signal(false);

  readonly modalOpen = signal(false);
  readonly selectedId = signal('');
  readonly detailJob = signal<JobRecord | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');

  private readonly categoriesVersion = signal(0);

  readonly categories = computed(() => {
    this.categoriesVersion();
    return this.jobsStore.categories;
  });
  readonly categoriesError = computed(() => {
    this.categoriesVersion();
    return this.jobsStore.categoriesError;
  });

  readonly visibleCategories = computed(() => {
    const all = this.categories();
    if (this.categoriesExpanded() || all.length <= CATEGORY_PREVIEW_COUNT) return all;
    const preview = all.slice(0, CATEGORY_PREVIEW_COUNT);
    const selected = this.category();
    if (!selected) return preview;
    const alreadyShown = preview.some((item) => categorySlug(item) === selected);
    if (alreadyShown) return preview;
    const selectedItem = all.find((item) => categorySlug(item) === selected);
    return selectedItem ? [...preview, selectedItem] : preview;
  });

  readonly hasMoreCategories = computed(
    () => this.categories.length > CATEGORY_PREVIEW_COUNT
  );

  readonly detailLogo = computed(() => jobLogo(this.detailJob()));
  readonly detailFacts = computed(() => buildDetailFacts(this.detailJob()));
  readonly detailTimeline = computed(() => buildDetailTimeline(this.detailJob()));
  readonly detailDescriptionHtml = computed((): SafeHtml | null => {
    const html = buildDetailDescriptionHtml(this.detailJob());
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
  });
  readonly detailRequirementsHtml = computed((): SafeHtml | null => {
    const html = buildDetailRequirementsHtml(this.detailJob());
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
  });
  readonly detailApplyUrl = computed(() => jobBoxPublicUrl(this.detailJob()));

  readonly jobTitle = jobTitle;
  readonly jobCompany = jobCompany;
  readonly jobLogo = jobLogo;
  readonly jobBadges = jobBadges;
  readonly jobSnippet = jobSnippet;
  readonly categoryLabel = categoryLabel;
  readonly categorySlug = categorySlug;

  constructor() {
    effect(() => {
      const locked = this.lockedCategory();
      this.category.set(locked || '');
      this.page.set(1);
      this.search.set('');
      this.debouncedSearch.set('');
      this.categoriesExpanded.set(false);
    });

    effect((onCleanup) => {
      const value = this.search();
      const timer = setTimeout(() => {
        this.debouncedSearch.set(value.trim());
        this.page.set(1);
      }, 280);
      onCleanup(() => clearTimeout(timer));
    });

    effect(() => {
      if (this.showCategoryFilters()) {
        void this.loadCategories();
      }
    });

    effect(() => {
      const query = {
        page: this.page(),
        perPage: PER_PAGE,
        search: this.debouncedSearch(),
        category: this.lockedCategory() || this.category(),
      };
      void this.loadJobs(query);
    });

    effect((onCleanup) => {
      const open = this.modalOpen();
      document.body.classList.toggle('modal-open', open);
      onCleanup(() => document.body.classList.remove('modal-open'));
    });

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.modalOpen()) {
        this.closeModal();
      }
    };
    window.addEventListener('keydown', onKeydown);
    this.destroyRef.onDestroy(() => window.removeEventListener('keydown', onKeydown));
  }

  private currentListQuery() {
    return {
      page: this.page(),
      perPage: PER_PAGE,
      search: this.debouncedSearch(),
      category: this.lockedCategory() || this.category(),
    };
  }

  private async loadCategories(): Promise<void> {
    if (!this.showCategoryFilters()) return;
    try {
      await this.jobsStore.ensureCategories();
    } catch {
      // Error string lives on the store for the UI.
    } finally {
      this.categoriesVersion.update((v) => v + 1);
    }
  }

  private async loadJobs(query: {
    page: number;
    perPage: number;
    search: string;
    category: string;
  }): Promise<void> {
    const requestId = ++this.listRequestId;
    const cached = this.jobsStore.peekList(query);

    if (cached) {
      this.jobs.set(cached.jobs);
      this.total.set(cached.total);
      this.loading.set(false);
      this.refreshing.set(!cached.fresh);
      this.error.set('');
    } else {
      this.loading.set(true);
      this.refreshing.set(false);
      this.error.set('');
    }

    try {
      const result = await this.jobsStore.ensureList(query);
      if (requestId !== this.listRequestId) return;
      this.jobs.set(result.jobs);
      this.total.set(result.total);
      this.error.set('');
    } catch (err) {
      if (requestId !== this.listRequestId) return;
      if (!cached) {
        this.jobs.set([]);
        this.total.set(0);
        this.error.set(err instanceof Error ? err.message : 'Could not load jobs');
      }
    } finally {
      if (requestId === this.listRequestId) {
        this.loading.set(false);
        this.refreshing.set(false);
      }
    }
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  selectCategory(slug: string): void {
    if (this.lockedCategory()) return;
    this.category.update((prev) => (prev === slug ? '' : slug));
    this.page.set(1);
  }

  toggleCategoriesExpanded(): void {
    this.categoriesExpanded.update((prev) => !prev);
  }

  onPageChange(nextPage: number): void {
    this.page.set(nextPage);
  }

  async openJob(job: JobRecord): Promise<void> {
    const id = job?.id;
    if (id == null) return;
    const idStr = String(id);
    const requestId = ++this.detailRequestId;
    this.selectedId.set(idStr);
    this.selectedIdRef = idStr;
    this.modalOpen.set(true);
    this.detailError.set('');

    if (job && typeof job === 'object') {
      this.jobsStore.seedDetail(job);
    }

    const cached = this.jobsStore.peekDetail(idStr);
    let hasDetail = false;
    if (cached?.job) {
      this.detailJob.set(cached.job);
      this.detailLoading.set(false);
      hasDetail = true;
    } else if (job && typeof job === 'object') {
      this.detailJob.set(job);
      this.detailLoading.set(false);
      hasDetail = true;
    } else {
      this.detailJob.set(null);
      this.detailLoading.set(true);
    }

    try {
      const result = await this.jobsStore.ensureDetail(idStr);
      if (requestId !== this.detailRequestId || this.selectedIdRef !== idStr) return;
      this.detailJob.set(result.job);
      this.detailError.set('');
    } catch (err) {
      if (requestId !== this.detailRequestId || this.selectedIdRef !== idStr) return;
      if (!hasDetail) {
        this.detailError.set(err instanceof Error ? err.message : 'Could not load job');
      }
    } finally {
      if (requestId === this.detailRequestId) {
        this.detailLoading.set(false);
      }
    }
  }

  onCardKeydown(event: KeyboardEvent, job: JobRecord): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void this.openJob(job);
    }
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedId.set('');
    this.selectedIdRef = '';
    this.detailJob.set(null);
    this.detailError.set('');
    this.detailLoading.set(false);
    this.detailRequestId += 1;
  }

  onModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}
