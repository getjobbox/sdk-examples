<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const menuOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

watch(
  () => route.fullPath,
  () => {
    closeMenu()
  }
)

function onKeydown(event) {
  if (event.key === 'Escape') closeMenu()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="app-shell">
    <header class="site-nav">
      <div class="site-nav-inner">
        <RouterLink class="brand" to="/" @click="closeMenu">JobFinder</RouterLink>

        <button
          type="button"
          class="nav-toggle"
          :aria-expanded="menuOpen ? 'true' : 'false'"
          aria-controls="site-nav-links"
          @click="toggleMenu"
        >
          <span class="sr-only">{{ menuOpen ? 'Close menu' : 'Open menu' }}</span>
          <span class="nav-toggle-bars" aria-hidden="true" />
        </button>

        <nav
          id="site-nav-links"
          class="nav-links"
          :class="{ open: menuOpen }"
          aria-label="Primary"
        >
          <RouterLink
            to="/"
            class="nav-link"
            :class="{ active: route.name === 'all-jobs' }"
          >
            All Jobs
          </RouterLink>
          <RouterLink
            to="/hr"
            class="nav-link"
            :class="{ active: route.name === 'hr-jobs' }"
          >
            HR Jobs
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <RouterView :key="route.fullPath" />
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
          src="/brand/icon.webp"
          alt="JobBox"
          width="28"
          height="28"
        />
        <span class="powered-by-name">JobBox</span>
      </a>
    </footer>
  </div>
</template>
