<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */

$routes->get('/', 'Jobs::index');
$routes->get('hr', 'Jobs::hr');

$routes->get('api/health', 'Api::health');
$routes->get('api/categories', 'Api::categories');
$routes->get('api/jobs', 'Api::jobs');
$routes->get('api/jobs/(:segment)', 'Api::job/$1');
