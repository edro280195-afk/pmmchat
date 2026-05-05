import { Component, OnInit, OnDestroy, ViewChild, ElementRef, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tiptap-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tiptap-editor-wrap">
      <div #editorContainer class="tiptap-editor"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tiptap-editor-wrap {
      position: relative;
      width: 100%;
    }

    .tiptap-editor {
      min-height: 24px;
      max-height: 150px;
      overflow-y: auto;
      padding: 8px 12px;
      border: none;
      background: transparent;
      font-family: inherit;
      font-size: inherit;
      line-height: 1.5;
      color: var(--app-fg);
      outline: none;

      p {
        margin: 0;
      }
    }
  `]
})
export class TiptapEditorComponent implements OnInit, OnDestroy {
  placeholder = input<string>('');
  participants = input<any[]>([]);
  contentChange = output<string>();
  mentionSelect = output<any>();
  pasteImage = output<File>();

  @ViewChild('editorContainer') editorContainer!: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    // Tiptap editor initialization would go here
    // For now, we'll use a simple contenteditable div
    if (this.editorContainer) {
      const el = this.editorContainer.nativeElement;
      el.contentEditable = 'true';
      el.addEventListener('input', this.onEditorInput.bind(this));
      el.addEventListener('paste', this.onPaste.bind(this));
    }
  }

  ngOnDestroy(): void {
    if (this.editorContainer) {
      const el = this.editorContainer.nativeElement;
      el.removeEventListener('input', this.onEditorInput.bind(this));
      el.removeEventListener('paste', this.onPaste.bind(this));
    }
  }

  private onEditorInput(event: Event): void {
    const content = (event.target as HTMLElement).innerHTML;
    this.contentChange.emit(content);
  }

  private onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          this.pasteImage.emit(blob);
        }
        return;
      }
    }
  }

  getContent(): string {
    return this.editorContainer?.nativeElement?.innerHTML || '';
  }

  setContent(content: string): void {
    if (this.editorContainer) {
      this.editorContainer.nativeElement.innerHTML = content;
    }
  }

  clearContent(): void {
    if (this.editorContainer) {
      this.editorContainer.nativeElement.innerHTML = '';
    }
  }
}
