/** Official JobBox (BoltCliq) public job page origin. */
export const JOBBOX_APP_ORIGIN = String(
  (globalThis as { __JOBBOX_APP_URL__?: string }).__JOBBOX_APP_URL__ ||
    'https://app.getjobbox.com'
).replace(/\/$/, '');

export function humanizeLabel(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower === 'onsite' || lower === 'on_site' || lower === 'on-site') return 'On-site';
  if (lower === 'remote') return 'Remote';
  if (lower === 'hybrid') return 'Hybrid';
  return raw
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(value: unknown): string {
  if (value == null || value === '') return '';
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(value: unknown): string {
  if (value == null || value === '') return '';
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) return String(value);
  const date = formatDate(value);
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date} at ${time}`;
}

export function formatSalaryDisplay(salaryRange: unknown, currency: unknown): string {
  if (salaryRange == null || salaryRange === '') return '';
  const display = String(salaryRange).trim();
  if (!display) return '';
  const currencyCode =
    typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : '';
  if (!currencyCode) return display;
  const alreadyHasCurrency = new RegExp(
    `\\b${currencyCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
    'i'
  ).test(display);
  if (alreadyHasCurrency) return display;
  return `${display} ${currencyCode}`;
}

export function jobBoxPublicUrl(
  job: { id?: unknown } | null | undefined,
  origin: string = JOBBOX_APP_ORIGIN
): string {
  const id = job?.id;
  if (!id) return '';
  return `${String(origin).replace(/\/$/, '')}/j/${encodeURIComponent(String(id))}`;
}

export function formatDetailValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Light markdown → HTML for description / requirements. */
export function formatRichText(raw: string): string {
  const text = String(raw).replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;

  const lines = text.split('\n');
  const parts: string[] = [];
  let listOpen = false;

  const flushList = () => {
    if (listOpen) {
      parts.push('</ul>');
      listOpen = false;
    }
  };

  const inline = (line: string) =>
    escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      parts.push(`<h${level + 2}>${inline(heading[2])}</h${level + 2}>`);
      continue;
    }
    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      if (!listOpen) {
        parts.push('<ul>');
        listOpen = true;
      }
      parts.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    flushList();
    parts.push(`<p>${inline(trimmed)}</p>`);
  }
  flushList();
  return parts.join('');
}
