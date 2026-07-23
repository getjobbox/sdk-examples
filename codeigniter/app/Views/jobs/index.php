<?= $this->extend('layouts/main') ?>

<?= $this->section('content') ?>
<div
  class="jobs-page"
  id="jobs-page"
  data-locked-category="<?= esc($lockedCategory ?? '') ?>"
  data-show-categories="<?= ! empty($showCategories) ? '1' : '0' ?>"
>
  <header class="hero-banner">
    <div class="hero-banner-media" aria-hidden="true"></div>
    <div class="hero-banner-scrim" aria-hidden="true"></div>
    <div class="hero-banner-inner">
      <?php if (! empty($pageTitle)): ?>
        <p class="hero-section"><?= esc($pageTitle) ?></p>
      <?php endif; ?>
      <h1>JobFinder</h1>

      <label class="search">
        <span class="sr-only">Search jobs</span>
        <input
          id="job-search"
          type="search"
          placeholder="Search titles, companies…"
          autocomplete="off"
        >
        <svg class="search-icon" width="18" height="18" viewBox="0 0 256 256" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M232.49 215.51l-50.66-50.66a92.14 92.14 0 1 0-17 17l50.66 50.66a12 12 0 0 0 17-17ZM44 112a68 68 0 1 1 68 68 68.07 68.07 0 0 1-68-68Z"/>
        </svg>
      </label>

      <?php if (! empty($showCategories)): ?>
        <div class="categories" id="categories" aria-label="Job categories">
          <p class="categories-empty" id="categories-loading">Loading categories…</p>
        </div>
      <?php else: ?>
        <p class="category-lock">
          Showing <strong>HR &amp; People</strong> roles only
        </p>
      <?php endif; ?>
    </div>
  </header>

  <div class="page">
    <section class="status" aria-live="polite" id="status">
      <p class="sr-only">Loading jobs…</p>
    </section>

    <ul class="list" id="job-list" aria-busy="true" aria-label="Jobs"></ul>

    <div class="pager" id="pager" hidden></div>

    <div
      class="modal-root"
      id="job-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-title"
      hidden
    >
      <div class="modal">
        <header class="modal-head">
          <div class="modal-title-block" id="modal-title-block"></div>
          <button type="button" class="modal-close" id="modal-close" aria-label="Close">×</button>
        </header>
        <div class="modal-body" id="modal-body" aria-busy="false"></div>
        <footer class="modal-foot" id="modal-foot" hidden></footer>
      </div>
    </div>
  </div>
</div>
<?= $this->endSection() ?>
