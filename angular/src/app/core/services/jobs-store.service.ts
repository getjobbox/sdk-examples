import { Injectable } from '@angular/core';
import {
  ensureCategories,
  ensureDetail,
  ensureList,
  getJobsState,
  peekDetail,
  peekList,
  seedDetail,
} from './jobs-cache';

@Injectable({ providedIn: 'root' })
export class JobsStoreService {
  peekList = peekList;
  peekDetail = peekDetail;
  seedDetail = seedDetail;
  ensureList = ensureList;
  ensureDetail = ensureDetail;
  ensureCategories = ensureCategories;

  get categories() {
    return getJobsState().categories;
  }

  get categoriesError() {
    return getJobsState().categoriesError;
  }
}
