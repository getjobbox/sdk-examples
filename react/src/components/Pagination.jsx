import { useMemo } from 'react'

const MAX_VISIBLE_PAGES = 5
const HALF_VISIBLE = Math.floor(MAX_VISIBLE_PAGES / 2)

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  loading = false,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem =
    totalItems === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalItems)

  const visiblePages = useMemo(() => {
    if (totalPages <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    let start = Math.max(1, currentPage - HALF_VISIBLE)
    let end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1)
    if (end === totalPages) {
      start = Math.max(1, end - MAX_VISIBLE_PAGES + 1)
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [currentPage, totalPages])

  const showFirstPage = totalPages > MAX_VISIBLE_PAGES && visiblePages[0] > 1
  const showLastPage =
    totalPages > MAX_VISIBLE_PAGES &&
    visiblePages[visiblePages.length - 1] < totalPages
  const showStartEllipsis = totalPages > MAX_VISIBLE_PAGES && visiblePages[0] > 2
  const showEndEllipsis =
    totalPages > MAX_VISIBLE_PAGES &&
    visiblePages[visiblePages.length - 1] < totalPages - 1

  function goToPage(page) {
    if (loading) return
    const next = Math.max(1, Math.min(totalPages, page))
    if (next === currentPage) return
    onPageChange?.(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (totalItems <= 0) return null

  return (
    <div className="pager">
      <p className="pager-summary">
        Showing {startItem} to {endItem} of {totalItems.toLocaleString()} results
      </p>

      {totalPages > 1 ? (
        <div className="pager-controls">
          <button
            type="button"
            className="pager-btn"
            disabled={loading || currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            Previous
          </button>

          <div className="pager-pages">
            {showFirstPage ? (
              <button
                type="button"
                className="pager-num"
                disabled={loading}
                onClick={() => goToPage(1)}
              >
                1
              </button>
            ) : null}
            {showStartEllipsis ? <span className="pager-ellipsis">…</span> : null}

            {visiblePages.map((page) => (
              <button
                key={page}
                type="button"
                className={`pager-num${page === currentPage ? ' active' : ''}`}
                disabled={loading}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}

            {showEndEllipsis ? <span className="pager-ellipsis">…</span> : null}
            {showLastPage ? (
              <button
                type="button"
                className="pager-num"
                disabled={loading}
                onClick={() => goToPage(totalPages)}
              >
                {totalPages}
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className="pager-btn"
            disabled={loading || currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
