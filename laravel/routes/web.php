<?php

use App\Http\Controllers\ApiController;
use App\Http\Controllers\JobsController;
use Illuminate\Support\Facades\Route;

Route::get('/', [JobsController::class, 'index'])->name('jobs.index');
Route::get('/hr', [JobsController::class, 'hr'])->name('jobs.hr');

Route::get('/api/health', [ApiController::class, 'health']);
Route::get('/api/categories', [ApiController::class, 'categories']);
Route::get('/api/jobs', [ApiController::class, 'jobs']);
Route::get('/api/jobs/{id}', [ApiController::class, 'job'])->where('id', '[A-Za-z0-9\-]+');
