<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Libraries\JobBoxClient;
use GetJobBox\Exceptions\JobBoxApiException;
use GetJobBox\Exceptions\JobBoxNetworkException;
use Throwable;

/**
 * Thin JSON API matching the Vue example's /api/* contract.
 * Calls getjobbox/sdk server-side so the key never reaches the browser.
 */
class Api extends BaseController
{
    public function health()
    {
        return $this->response->setJSON([
            'ok'      => true,
            'baseUrl' => JobBoxClient::baseUrl(),
            'sdk'     => 'php',
        ]);
    }

    public function categories()
    {
        try {
            $result = JobBoxClient::make()->jobs->categories();

            return $this->response->setJSON([
                'categories' => is_array($result['categories'] ?? null) ? $result['categories'] : [],
            ]);
        } catch (Throwable $e) {
            return $this->sdkError($e, 'categories');
        }
    }

    public function jobs()
    {
        try {
            $search   = trim((string) ($this->request->getGet('search') ?? ''));
            $category = trim((string) ($this->request->getGet('category') ?? ''));
            $page     = max(1, (int) ($this->request->getGet('page') ?? 1));
            $perPage  = min(50, max(1, (int) ($this->request->getGet('perPage') ?? 12)));

            $params = [
                'page'    => $page,
                'perPage' => $perPage,
            ];
            if ($search !== '') {
                $params['search'] = $search;
            }
            if ($category !== '') {
                $params['category'] = $category;
            }

            $result = JobBoxClient::make()->jobs->list($params);

            return $this->response->setJSON([
                'jobs'    => $result['jobs'] ?? [],
                'total'   => $result['total'] ?? 0,
                'page'    => $result['page'] ?? $page,
                'perPage' => $result['perPage'] ?? $perPage,
            ]);
        } catch (Throwable $e) {
            return $this->sdkError($e, 'jobs');
        }
    }

    public function job(string $id)
    {
        $id = trim($id);
        if ($id === '') {
            return $this->response->setStatusCode(400)->setJSON([
                'message' => 'Job id is required',
            ]);
        }

        try {
            $result = JobBoxClient::make()->jobs->get($id);

            return $this->response->setJSON([
                'job' => $result['job'] ?? null,
            ]);
        } catch (Throwable $e) {
            return $this->sdkError($e, 'job');
        }
    }

    private function sdkError(Throwable $err, string $label)
    {
        $status = 502;
        $code   = null;

        if ($err instanceof JobBoxApiException) {
            $status = $err->status > 0 ? $err->status : 502;
            $code   = $err->apiCode;
        } elseif ($err instanceof JobBoxNetworkException) {
            $status = 502;
        } elseif ($err instanceof \RuntimeException && str_contains($err->getMessage(), 'JOBBOX_API_KEY')) {
            $status = 500;
        }

        log_message('error', '[{label}] {message}', [
            'label'   => $label,
            'message' => $err->getMessage(),
        ]);

        $payload = [
            'message' => $err->getMessage() !== '' ? $err->getMessage() : "Failed to fetch {$label}",
        ];
        if ($code !== null) {
            $payload['code'] = $code;
        }

        return $this->response->setStatusCode($status)->setJSON($payload);
    }
}
