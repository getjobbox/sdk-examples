<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\JobBoxClient;
use GetJobBox\Exceptions\JobBoxApiException;
use GetJobBox\Exceptions\JobBoxNetworkException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * Thin JSON API matching the Vue / CodeIgniter /api/* contract.
 * Calls getjobbox/sdk server-side so the key never reaches the browser.
 */
class ApiController extends Controller
{
    public function health(): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'baseUrl' => JobBoxClient::baseUrl(),
            'sdk' => 'php',
            'example' => 'laravel',
        ]);
    }

    public function categories(): JsonResponse
    {
        try {
            $result = JobBoxClient::make()->jobs->categories();

            return response()->json([
                'categories' => is_array($result['categories'] ?? null) ? $result['categories'] : [],
            ]);
        } catch (Throwable $e) {
            return $this->sdkError($e, 'categories');
        }
    }

    public function jobs(Request $request): JsonResponse
    {
        try {
            $search = trim((string) $request->query('search', ''));
            $category = trim((string) $request->query('category', ''));
            $page = max(1, (int) $request->query('page', 1));
            $perPage = min(50, max(1, (int) $request->query('perPage', 12)));

            $params = [
                'page' => $page,
                'perPage' => $perPage,
            ];
            if ($search !== '') {
                $params['search'] = $search;
            }
            if ($category !== '') {
                $params['category'] = $category;
            }

            $result = JobBoxClient::make()->jobs->list($params);

            return response()->json([
                'jobs' => $result['jobs'] ?? [],
                'total' => $result['total'] ?? 0,
                'page' => $result['page'] ?? $page,
                'perPage' => $result['perPage'] ?? $perPage,
            ]);
        } catch (Throwable $e) {
            return $this->sdkError($e, 'jobs');
        }
    }

    public function job(string $id): JsonResponse
    {
        $id = trim($id);
        if ($id === '') {
            return response()->json(['message' => 'Job id is required'], 400);
        }

        try {
            $result = JobBoxClient::make()->jobs->get($id);

            return response()->json([
                'job' => $result['job'] ?? null,
            ]);
        } catch (Throwable $e) {
            return $this->sdkError($e, 'job');
        }
    }

    private function sdkError(Throwable $err, string $label): JsonResponse
    {
        $status = 502;
        $code = null;

        if ($err instanceof JobBoxApiException) {
            $status = $err->status > 0 ? $err->status : 502;
            $code = $err->apiCode;
        } elseif ($err instanceof JobBoxNetworkException) {
            $status = 502;
        } elseif ($err instanceof \RuntimeException && str_contains($err->getMessage(), 'JOBBOX_API_KEY')) {
            $status = 500;
        }

        report($err);

        $payload = [
            'message' => $err->getMessage() !== '' ? $err->getMessage() : "Failed to fetch {$label}",
        ];
        if ($code !== null) {
            $payload['code'] = $code;
        }

        return response()->json($payload, $status);
    }
}
