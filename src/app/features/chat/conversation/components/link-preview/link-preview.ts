import { Component, Input, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { LinkPreviewService, LinkPreviewData } from '../../../../../core/services/link-preview.service';

@Component({
  selector: 'app-link-preview',
  standalone: true,
  templateUrl: './link-preview.html',
  styleUrl: './link-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkPreviewComponent implements OnInit {
  @Input({ required: true }) url!: string;

  private linkPreviewService = inject(LinkPreviewService);

  preview = signal<LinkPreviewData | null>(null);
  loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.linkPreviewService.getPreview(this.url);
      this.preview.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  getDomain(): string {
    try {
      return new URL(this.url).hostname.replace('www.', '');
    } catch {
      return this.url;
    }
  }
}
