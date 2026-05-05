import { Pipe, PipeTransform, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

@Pipe({
  name: 'secureMedia',
  standalone: true
})
export class SecureMediaPipe implements PipeTransform, OnDestroy {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private objectUrls = new Map<number, string>();
  private safeUrls = new Map<number, SafeResourceUrl>();

  transform(attachmentId: number): Observable<SafeResourceUrl> {
    if (!attachmentId) return of('');

    if (this.safeUrls.has(attachmentId)) {
      return of(this.safeUrls.get(attachmentId)!);
    }

    const url = `${environment.apiUrl}/files/${attachmentId}`;
    
    return this.http.get(url, { responseType: 'arraybuffer', observe: 'response' }).pipe(
      map(response => {
        const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
        const blob = new Blob([response.body!], { type: contentType });
        const objectUrl = URL.createObjectURL(blob);
        this.objectUrls.set(attachmentId, objectUrl);
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
        this.safeUrls.set(attachmentId, safeUrl);
        return safeUrl;
      }),
      catchError(err => {
        console.error('Failed to load secure media:', err);
        return of('');
      })
    );
  }

  ngOnDestroy(): void {
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
    this.objectUrls.clear();
    this.safeUrls.clear();
  }
}
