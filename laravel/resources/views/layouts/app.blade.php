<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ $documentTitle ?? 'JobFinder' }}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap"
    rel="stylesheet"
  >
  <link rel="stylesheet" href="{{ asset('css/app.css') }}">
</head>
<body>
  <div class="app-shell">
    <header class="site-nav">
      <div class="site-nav-inner">
        <a class="brand" href="{{ url('/') }}">JobFinder</a>

        <button
          type="button"
          class="nav-toggle"
          aria-expanded="false"
          aria-controls="site-nav-links"
          id="nav-toggle"
        >
          <span class="sr-only">Open menu</span>
          <span class="nav-toggle-bars" aria-hidden="true"></span>
        </button>

        <nav id="site-nav-links" class="nav-links" aria-label="Primary">
          <a
            href="{{ url('/') }}"
            class="nav-link{{ ($routeName ?? '') === 'all-jobs' ? ' active' : '' }}"
          >All Jobs</a>
          <a
            href="{{ url('/hr') }}"
            class="nav-link{{ ($routeName ?? '') === 'hr-jobs' ? ' active' : '' }}"
          >HR Jobs</a>
        </nav>
      </div>
    </header>

    <main class="app-main">
      @yield('content')
    </main>

    <footer class="site-footer">
      <a
        class="powered-by"
        href="https://getjobbox.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="powered-by-label">Powered by</span>
        <img
          class="powered-by-logo"
          src="{{ asset('brand/icon.webp') }}"
          alt="JobBox"
          width="28"
          height="28"
        >
        <span class="powered-by-name">JobBox</span>
      </a>
    </footer>
  </div>

  <script>
    window.JOBFINDER_CONFIG = {
      pageTitle: @json($pageTitle ?? 'All Jobs'),
      routeName: @json($routeName ?? 'all-jobs'),
      lockedCategory: @json($lockedCategory ?? ''),
      showCategories: @json(! empty($showCategories)),
      perPage: {{ (int) ($perPage ?? 24) }},
      jobboxAppUrl: @json($jobboxAppUrl ?? 'https://app.getjobbox.com'),
    };
  </script>
  <script src="{{ asset('js/jobs.js') }}" defer></script>
</body>
</html>
