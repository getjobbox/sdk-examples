<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Libraries\JobBoxClient;

/**
 * Server-rendered job board shell (mirrors the Vue JobFinder example).
 * List/detail data is loaded via /api/* JSON routes from public/js/jobs.js.
 */
class Jobs extends BaseController
{
    public function index()
    {
        return $this->renderBoard([
            'pageTitle'       => 'All Jobs',
            'routeName'       => 'all-jobs',
            'lockedCategory'  => '',
            'showCategories'  => true,
            'documentTitle'   => 'All Jobs · JobFinder',
        ]);
    }

    public function hr()
    {
        return $this->renderBoard([
            'pageTitle'       => 'HR Jobs',
            'routeName'       => 'hr-jobs',
            'lockedCategory'  => 'hr',
            'showCategories'  => false,
            'documentTitle'   => 'HR Jobs · JobFinder',
        ]);
    }

    /**
     * @param array{
     *   pageTitle: string,
     *   routeName: string,
     *   lockedCategory: string,
     *   showCategories: bool,
     *   documentTitle: string
     * } $meta
     */
    private function renderBoard(array $meta)
    {
        helper('job_format');

        return view('jobs/index', [
            'pageTitle'      => $meta['pageTitle'],
            'routeName'      => $meta['routeName'],
            'lockedCategory' => $meta['lockedCategory'],
            'showCategories' => $meta['showCategories'],
            'documentTitle'  => $meta['documentTitle'],
            'jobboxAppUrl'   => JobBoxClient::appUrl(),
            'perPage'        => 24,
        ]);
    }
}
