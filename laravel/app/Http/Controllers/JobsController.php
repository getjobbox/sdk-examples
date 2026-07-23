<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\JobBoxClient;
use Illuminate\View\View;

/**
 * Server-rendered job board shell (mirrors the Vue / CodeIgniter JobFinder example).
 * List/detail data is loaded via /api/* JSON routes from public/js/jobs.js.
 */
class JobsController extends Controller
{
    public function index(): View
    {
        return $this->renderBoard([
            'pageTitle' => 'All Jobs',
            'routeName' => 'all-jobs',
            'lockedCategory' => '',
            'showCategories' => true,
            'documentTitle' => 'All Jobs · JobFinder',
        ]);
    }

    public function hr(): View
    {
        return $this->renderBoard([
            'pageTitle' => 'HR Jobs',
            'routeName' => 'hr-jobs',
            'lockedCategory' => 'hr',
            'showCategories' => false,
            'documentTitle' => 'HR Jobs · JobFinder',
        ]);
    }

    /**
     * @param  array{
     *   pageTitle: string,
     *   routeName: string,
     *   lockedCategory: string,
     *   showCategories: bool,
     *   documentTitle: string
     * }  $meta
     */
    private function renderBoard(array $meta): View
    {
        return view('jobs.index', [
            'pageTitle' => $meta['pageTitle'],
            'routeName' => $meta['routeName'],
            'lockedCategory' => $meta['lockedCategory'],
            'showCategories' => $meta['showCategories'],
            'documentTitle' => $meta['documentTitle'],
            'jobboxAppUrl' => JobBoxClient::appUrl(),
            'perPage' => 24,
        ]);
    }
}
