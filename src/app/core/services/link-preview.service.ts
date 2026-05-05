import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
}

@Injectable({ providedIn: 'root' })
export class LinkPreviewService {
  private http = inject(HttpClient);
  private cache = new Map<string, LinkPreviewData | null>();
  private pending = new Map<string, Promise<LinkPreviewData | null>>();

  async getPreview(url: string): Promise<LinkPreviewData | null> {
    // Check cache first
    if (this.cache.has(url)) {
      return this.cache.get(url) ?? null;
    }

    // Deduplicate in-flight requests
    if (this.pending.has(url)) {
      return this.pending.get(url)!;
    }

    const promise = this.fetchPreview(url);
    this.pending.set(url, promise);

    try {
      const result = await promise;
      this.cache.set(url, result);
      return result;
    } catch {
      this.cache.set(url, null);
      return null;
    } finally {
      this.pending.delete(url);
    }
  }

  private async fetchPreview(url: string): Promise<LinkPreviewData | null> {
    try {
      const data = await firstValueFrom(
        this.http.get<LinkPreviewData>(`${environment.apiUrl}/link-preview`, {
          params: { url }
        })
      );
      return data && data.title ? data : null;
    } catch {
      return null;
    }
  }

  /** Extract the first URL from a message content string */
  extractFirstUrl(content: string | null | undefined): string | null {
    if (!content) return null;
    const match = content.match(/(https?:\/\/[^\s<>"']+)/i);
    return match ? match[1] : null;
  }
}
