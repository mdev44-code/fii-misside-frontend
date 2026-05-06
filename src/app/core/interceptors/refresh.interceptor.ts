import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Si 401 et pas déjà une requête de refresh/login, on tente le refresh
      const isAuthRoute = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');
      if (err.status === 401 && !isAuthRoute) {
        return auth.refreshToken().pipe(
          switchMap(tokens => {
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.access_token}` },
            });
            return next(retried);
          }),
          catchError(refreshErr => throwError(() => refreshErr)),
        );
      }
      return throwError(() => err);
    }),
  );
};
