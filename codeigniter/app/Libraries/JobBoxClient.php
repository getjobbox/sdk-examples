<?php

declare(strict_types=1);

namespace App\Libraries;

use GetJobBox\JobBox;
use InvalidArgumentException;
use RuntimeException;

/**
 * Factory for the official JobBox PHP SDK client.
 * Keeps JOBBOX_API_KEY on the server only.
 */
class JobBoxClient
{
    private static ?JobBox $instance = null;

    public static function make(): JobBox
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $apiKey = trim((string) env('JOBBOX_API_KEY', ''));
        if ($apiKey === '') {
            throw new RuntimeException(
                'Missing JOBBOX_API_KEY. Copy .env.example → .env and set your key (same as the Vue example).',
            );
        }

        $baseUrl = trim((string) env('JOBBOX_BASE_URL', 'https://api.getjobbox.com'));
        if ($baseUrl === '') {
            $baseUrl = 'https://api.getjobbox.com';
        }

        try {
            self::$instance = new JobBox([
                'apiKey'  => $apiKey,
                'baseUrl' => $baseUrl,
                'appName' => 'jobbox-ci-example',
            ]);
        } catch (InvalidArgumentException $e) {
            throw new RuntimeException($e->getMessage(), (int) $e->getCode(), $e);
        }

        return self::$instance;
    }

    public static function baseUrl(): string
    {
        $baseUrl = trim((string) env('JOBBOX_BASE_URL', 'https://api.getjobbox.com'));

        return rtrim($baseUrl !== '' ? $baseUrl : 'https://api.getjobbox.com', '/');
    }

    public static function appUrl(): string
    {
        $appUrl = trim((string) env('JOBBOX_APP_URL', 'https://app.getjobbox.com'));

        return rtrim($appUrl !== '' ? $appUrl : 'https://app.getjobbox.com', '/');
    }
}
