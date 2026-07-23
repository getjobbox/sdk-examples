import { Routes } from '@angular/router';
import { JobsPageComponent } from './features/jobs/jobs-page.component';

export const routes: Routes = [
  {
    path: '',
    component: JobsPageComponent,
    data: { title: 'All Jobs' },
    title: 'All Jobs · JobFinder',
  },
  {
    path: 'hr',
    component: JobsPageComponent,
    data: { title: 'HR Jobs', lockedCategory: 'hr' },
    title: 'HR Jobs · JobFinder',
  },
  { path: '**', redirectTo: '' },
];
