import { Component, Input, computed, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <div
      class="avatar"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.fontSize.px]="fontSize()"
      [style.background]="gradient()"
    >
      {{ initials() }}
    </div>
  `,
  styles: `
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: #fff;
      font-weight: 600;
      letter-spacing: 0.5px;
      flex-shrink: 0;
      text-transform: uppercase;
      user-select: none;
    }
  `,
})
export class Avatar {
  readonly name = input<string>('');
  readonly size = input<number>(36);

  readonly fontSize = computed(() => Math.max(this.size() * 0.36, 10));

  readonly initials = computed(() => {
    const n = this.name().trim();
    if (!n) return '?';
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return n.substring(0, 2);
  });

  readonly gradient = computed(() => {
    const hash = this.hashCode(this.name());
    const idx = Math.abs(hash) % 8;
    const gradients = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
      'linear-gradient(135deg, #a18cd1, #fbc2eb)',
      'linear-gradient(135deg, #fccb90, #d57eeb)',
      'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
    ];
    return gradients[idx];
  });

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  }
}
