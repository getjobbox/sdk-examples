import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

const MAX_VISIBLE_PAGES = 5;
const HALF_VISIBLE = Math.floor(MAX_VISIBLE_PAGES / 2);

@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalItems() > 0) {
      <div class="pager">
        <p class="pager-summary">
          Showing {{ startItem() }} to {{ endItem() }} of
          {{ totalItems().toLocaleString() }} results
        </p>

        @if (totalPages() > 1) {
          <div class="pager-controls">
            <button
              type="button"
              class="pager-btn"
              [disabled]="loading() || currentPage() <= 1"
              (click)="goToPage(currentPage() - 1)"
            >
              Previous
            </button>

            <div class="pager-pages">
              @if (showFirstPage()) {
                <button
                  type="button"
                  class="pager-num"
                  [disabled]="loading()"
                  (click)="goToPage(1)"
                >
                  1
                </button>
              }
              @if (showStartEllipsis()) {
                <span class="pager-ellipsis">…</span>
              }

              @for (page of visiblePages(); track page) {
                <button
                  type="button"
                  class="pager-num"
                  [class.active]="page === currentPage()"
                  [disabled]="loading()"
                  (click)="goToPage(page)"
                >
                  {{ page }}
                </button>
              }

              @if (showEndEllipsis()) {
                <span class="pager-ellipsis">…</span>
              }
              @if (showLastPage()) {
                <button
                  type="button"
                  class="pager-num"
                  [disabled]="loading()"
                  (click)="goToPage(totalPages())"
                >
                  {{ totalPages() }}
                </button>
              }
            </div>

            <button
              type="button"
              class="pager-btn"
              [disabled]="loading() || currentPage() >= totalPages()"
              (click)="goToPage(currentPage() + 1)"
            >
              Next
            </button>
          </div>
        }
      </div>
    }
  `,
})
export class PaginationComponent {
  readonly currentPage = input.required<number>();
  readonly totalItems = input.required<number>();
  readonly itemsPerPage = input.required<number>();
  readonly loading = input(false);

  readonly pageChange = output<number>();

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.itemsPerPage()))
  );

  readonly startItem = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.itemsPerPage() + 1;
  });

  readonly endItem = computed(() => {
    if (this.totalItems() === 0) return 0;
    return Math.min(this.currentPage() * this.itemsPerPage(), this.totalItems());
  });

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    let start = Math.max(1, current - HALF_VISIBLE);
    let end = Math.min(total, start + MAX_VISIBLE_PAGES - 1);
    if (end === total) {
      start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  readonly showFirstPage = computed(
    () => this.totalPages() > MAX_VISIBLE_PAGES && (this.visiblePages()[0] ?? 0) > 1
  );

  readonly showLastPage = computed(() => {
    const pages = this.visiblePages();
    const last = pages[pages.length - 1] ?? 0;
    return this.totalPages() > MAX_VISIBLE_PAGES && last < this.totalPages();
  });

  readonly showStartEllipsis = computed(
    () => this.totalPages() > MAX_VISIBLE_PAGES && (this.visiblePages()[0] ?? 0) > 2
  );

  readonly showEndEllipsis = computed(() => {
    const pages = this.visiblePages();
    const last = pages[pages.length - 1] ?? 0;
    return this.totalPages() > MAX_VISIBLE_PAGES && last < this.totalPages() - 1;
  });

  goToPage(page: number): void {
    if (this.loading()) return;
    const next = Math.max(1, Math.min(this.totalPages(), page));
    if (next === this.currentPage()) return;
    this.pageChange.emit(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
