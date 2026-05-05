import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [],
  template: `<p>message-item works!</p>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageItem {
}
