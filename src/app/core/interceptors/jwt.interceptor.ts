import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError, timer, retry } from 'rxjs';
import { AuthService } from '../services/auth.service';

const attachToken = (req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // No interceptar las llamadas de auth para evitar loops
  if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh') || req.url.includes('/auth/logout')) {
    return next(req);
  }

  const cloned = attachToken(req, auth.getToken());

  return next(cloned).pipe(
    // Reintentar 2 veces con backoff exponencial solo para errores 5xx
    retry({
      count: 2,
      delay: (error, attempt) => {
        if (error.status >= 500 && error.status < 600) {
          return timer(attempt * 1000);
        }
        return throwError(() => error);
      },
    }),
    catchError(err => {
      if (err.status === 401 && auth.getRefreshToken()) {
        // Intentar renovar el token y reintentar la petición original
        return from(auth.refresh()).pipe(
          switchMap(response => {
            const retried = attachToken(req, response.token);
            return next(retried);
          }),
          catchError(refreshErr => {
            auth.logout();
            return throwError(() => refreshErr);
          })
        );
      }

      if (err.status === 401) {
        auth.logout();
      }

      return throwError(() => err);
    }),
  );
};
