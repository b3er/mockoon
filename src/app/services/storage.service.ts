import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, EMPTY, from, Observable } from 'rxjs';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  tap
} from 'rxjs/operators';
import { Logger } from 'src/app/classes/logger';
import { MainApi } from 'src/app/global';
import { ToastsService } from 'src/app/services/toasts.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private logger = new Logger('[SERVICE][STORAGE]');
  private saving$ = new BehaviorSubject<boolean>(false);

  constructor(private toastsService: ToastsService) {}

  /**
   * Saving in progress observable
   */
  public saving(): Observable<boolean> {
    return this.saving$.asObservable().pipe(distinctUntilChanged());
  }

  /**
   * Saving in progress observable value
   */
  public isSaving(): boolean {
    return this.saving$.value;
  }

  /**
   * Load data from JSON storage.
   * Handles storage failure.
   *
   * @param key
   */
  public loadData<T>(key: string): Observable<T> {
    return from(MainApi.invoke<T>('APP_READ_JSON_DATA', key)).pipe(
      catchError((error) => {
        const errorMessage = `Error while loading ${key}`;

        this.logger.error(
          `${errorMessage}: ${error.code || ''} ${error.message || ''}`
        );

        this.toastsService.addToast(
          'error',
          `${errorMessage}. Please restart the application.`
        );

        return EMPTY;
      })
    );
  }

  /**
   * Save date from a source using JSON storage.
   * Wait for the data to be saved before triggering a new save.
   * Handles storage failure.
   *
   * @param source
   * @param key
   * @param interval
   */
  public saveData<T>(
    source: Observable<T>,
    key: string,
    interval: number
  ): Observable<void> {
    return source.pipe(
      distinctUntilChanged(),
      tap(() => {
        this.saving$.next(true);
      }),
      debounceTime(interval),
      concatMap((data) =>
        from(MainApi.invoke<T>('APP_WRITE_JSON_DATA', key, data)).pipe(
          catchError((error) => {
            const errorMessage = `Error while saving ${key}`;

            this.logger.error(
              `${errorMessage}: ${error.code || ''} ${error.message || ''}`
            );

            this.toastsService.addToast(
              'error',
              `${errorMessage}. If the problem persists please restart the application.`
            );

            return EMPTY;
          }),
          tap(() => {
            this.saving$.next(false);
          })
        )
      )
    );
  }
}
