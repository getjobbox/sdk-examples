<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  itemsPerPage: { type: Number, required: true },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:page'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.itemsPerPage)))

const startItem = computed(() => {
  if (props.totalItems === 0) return 0
  return (props.currentPage - 1) * props.itemsPerPage + 1
})

const endItem = computed(() => {
  if (props.totalItems === 0) return 0
  return Math.min(props.currentPage * props.itemsPerPage, props.totalItems)
})

const maxVisiblePages = 5
const halfVisible = Math.floor(maxVisiblePages / 2)

const visiblePages = computed(() => {
  if (totalPages.value <= maxVisiblePages) {
    return Array.from({ length: totalPages.value }, (_, i) => i + 1)
  }

  let start = Math.max(1, props.currentPage - halfVisible)
  let end = Math.min(totalPages.value, start + maxVisiblePages - 1)

  if (end === totalPages.value) {
    start = Math.max(1, end - maxVisiblePages + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const showFirstPage = computed(
  () => totalPages.value > maxVisiblePages && visiblePages.value[0] > 1
)

const showLastPage = computed(
  () =>
    totalPages.value > maxVisiblePages &&
    visiblePages.value[visiblePages.value.length - 1] < totalPages.value
)

const showStartEllipsis = computed(
  () => totalPages.value > maxVisiblePages && visiblePages.value[0] > 2
)

const showEndEllipsis = computed(
  () =>
    totalPages.value > maxVisiblePages &&
    visiblePages.value[visiblePages.value.length - 1] < totalPages.value - 1
)

function goToPage(page) {
  if (props.loading) return
  const next = Math.max(1, Math.min(totalPages.value, page))
  if (next === props.currentPage) return
  emit('update:page', next)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div v-if="totalItems > 0" class="pager">
    <p class="pager-summary">
      Showing {{ startItem }} to {{ endItem }} of {{ totalItems.toLocaleString() }} results
    </p>

    <div v-if="totalPages > 1" class="pager-controls">
      <button
        type="button"
        class="pager-btn"
        :disabled="loading || currentPage <= 1"
        @click="goToPage(currentPage - 1)"
      >
        Previous
      </button>

      <div class="pager-pages">
        <button
          v-if="showFirstPage"
          type="button"
          class="pager-num"
          :disabled="loading"
          @click="goToPage(1)"
        >
          1
        </button>
        <span v-if="showStartEllipsis" class="pager-ellipsis">…</span>

        <button
          v-for="page in visiblePages"
          :key="page"
          type="button"
          class="pager-num"
          :class="{ active: page === currentPage }"
          :disabled="loading"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>

        <span v-if="showEndEllipsis" class="pager-ellipsis">…</span>
        <button
          v-if="showLastPage"
          type="button"
          class="pager-num"
          :disabled="loading"
          @click="goToPage(totalPages)"
        >
          {{ totalPages }}
        </button>
      </div>

      <button
        type="button"
        class="pager-btn"
        :disabled="loading || currentPage >= totalPages"
        @click="goToPage(currentPage + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>
