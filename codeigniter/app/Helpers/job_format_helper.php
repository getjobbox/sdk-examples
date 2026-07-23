<?php

declare(strict_types=1);

if (! function_exists('humanize_label')) {
    function humanize_label(mixed $value): string
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return '';
        }

        $lower = strtolower($raw);
        if (in_array($lower, ['onsite', 'on_site', 'on-site'], true)) {
            return 'On-site';
        }
        if ($lower === 'remote') {
            return 'Remote';
        }
        if ($lower === 'hybrid') {
            return 'Hybrid';
        }

        $spaced = trim(preg_replace('/[_-]+/', ' ', $raw) ?? $raw);

        return preg_replace_callback('/\b\w/', static fn (array $m): string => strtoupper($m[0]), $spaced) ?? $spaced;
    }
}

if (! function_exists('format_salary_display')) {
    function format_salary_display(mixed $salaryRange, mixed $currency): string
    {
        if ($salaryRange === null || $salaryRange === '') {
            return '';
        }

        $display = trim((string) $salaryRange);
        if ($display === '') {
            return '';
        }

        $currencyCode = is_string($currency) && trim($currency) !== ''
            ? strtoupper(trim($currency))
            : '';

        if ($currencyCode === '') {
            return $display;
        }

        if (preg_match('/\b' . preg_quote($currencyCode, '/') . '\b/i', $display) === 1) {
            return $display;
        }

        return $display . ' ' . $currencyCode;
    }
}

if (! function_exists('jobbox_public_url')) {
    function jobbox_public_url(array|object|null $job, ?string $origin = null): string
    {
        $id = null;
        if (is_array($job)) {
            $id = $job['id'] ?? null;
        } elseif (is_object($job)) {
            $id = $job->id ?? null;
        }

        if ($id === null || $id === '') {
            return '';
        }

        $base = rtrim($origin ?? \App\Libraries\JobBoxClient::appUrl(), '/');

        return $base . '/j/' . rawurlencode((string) $id);
    }
}

if (! function_exists('job_company')) {
    function job_company(array $job): string
    {
        $company = $job['company'] ?? $job['company_name'] ?? 'Company';

        return is_string($company) && $company !== '' ? $company : 'Company';
    }
}

if (! function_exists('job_title')) {
    function job_title(array $job): string
    {
        $title = $job['title'] ?? null;

        return is_string($title) && $title !== '' ? $title : 'Untitled role';
    }
}

if (! function_exists('job_logo')) {
    function job_logo(array $job): string
    {
        $url = $job['company_logo_url'] ?? null;
        if (! is_string($url)) {
            return '';
        }

        return preg_match('#^https?://#i', $url) === 1 ? $url : '';
    }
}

if (! function_exists('job_snippet')) {
    function job_snippet(array $job): string
    {
        $raw = $job['summary'] ?? $job['description'] ?? '';
        if (! is_string($raw) || trim($raw) === '') {
            return '';
        }

        $text = $raw;
        $text = preg_replace('/```[\s\S]*?```/', ' ', $text) ?? $text;
        $text = preg_replace('/`[^`]*`/', ' ', $text) ?? $text;
        $text = preg_replace('/!\[[^\]]*]\([^)]*\)/', ' ', $text) ?? $text;
        $text = preg_replace('/\[([^\]]*)]\([^)]*\)/', '$1', $text) ?? $text;
        $text = preg_replace('/<\/?[^>]+>/', ' ', $text) ?? $text;
        $text = preg_replace('/^#{1,6}\s+/m', '', $text) ?? $text;
        $text = preg_replace('/^[-*•]\s+/m', '', $text) ?? $text;
        $text = preg_replace('/\*\*(.+?)\*\*/', '$1', $text) ?? $text;
        $text = preg_replace('/\*(.+?)\*/', '$1', $text) ?? $text;
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;

        return trim($text);
    }
}

if (! function_exists('job_badges')) {
    /**
     * @return list<array{key: string, text: string, value: string}>
     */
    function job_badges(array $job): array
    {
        $badges = [];
        $push = static function (mixed $value, string $key) use (&$badges): void {
            if ($value === null || $value === '') {
                return;
            }
            $text = humanize_label($value);
            if ($text === '') {
                return;
            }
            foreach ($badges as $badge) {
                if (strcasecmp($badge['text'], $text) === 0) {
                    return;
                }
            }
            $badges[] = [
                'key'   => $key,
                'text'  => $text,
                'value' => (string) $value,
            ];
        };

        $push($job['work_mode'] ?? null, 'work_mode');
        $push($job['employment_type'] ?? null, 'employment_type');
        $push($job['seniority_level'] ?? null, 'seniority_level');
        $push($job['compensation_type'] ?? null, 'compensation_type');
        $push($job['category'] ?? null, 'category');
        $push($job['location'] ?? null, 'location');

        return array_slice($badges, 0, 5);
    }
}
