import { Component, ChangeDetectionStrategy, input, output, ViewChild, ElementRef, signal, effect, OnInit, AfterViewChecked, NO_ERRORS_SCHEMA, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Participant } from '../../../../../core/models/room.model';
import { ChatMessage } from '../../../../../core/models/message.model';
import { AutoResizeDirective } from '../../../../../shared/directives/auto-resize.directive';
import { FileSizePipe } from '../../../../../shared/pipes/file-size.pipe';
import { FloatingUiService } from '../../../../../core/services/floating-ui.service';
import gsap from 'gsap';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoResizeDirective, FileSizePipe],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './message-input.html',
  styleUrl: './message-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageInputComponent implements OnInit, AfterViewChecked {
  constructor(private floatingUi: FloatingUiService) {
    effect(() => {
      const recording = this.isRecording();
      if (recording) {
        setTimeout(() => this.startWaveformAnimation(), 50);
      } else {
        this.stopWaveformAnimation();
      }
    });
    effect(() => {
      const show = this.showEmojiPicker();
      if (show && this.emojiTrigger && this.emojiPicker) {
        setTimeout(() => {
          this.floatingUi.positionElement(
            this.emojiTrigger.nativeElement,
            this.emojiPicker.nativeElement,
            { placement: 'top-start', offset: 12 }
          );
        });
      } else if (!show && this.emojiPicker) {
        this.floatingUi.cleanup(this.emojiPicker.nativeElement);
      }
    });

    effect(() => {
      const suggestions = this.mentionSuggestions();
      if (suggestions.length > 0 && this.mentionDropdown && this.messageTextarea) {
        setTimeout(() => {
          this.floatingUi.positionElement(
            this.messageTextarea.nativeElement,
            this.mentionDropdown.nativeElement,
            { placement: 'top-start', offset: 4 }
          );
        });
      } else if (this.mentionDropdown) {
        this.floatingUi.cleanup(this.mentionDropdown.nativeElement);
      }
    });
  }

  ngOnInit(): void {}
  ngAfterViewChecked(): void {}

  @ViewChild('emojiTrigger') emojiTrigger!: ElementRef<HTMLElement>;
  @ViewChild('emojiPicker') emojiPicker!: ElementRef<HTMLElement>;
  @ViewChild('mentionDropdown') mentionDropdown!: ElementRef<HTMLElement>;
  @ViewChild('messageTextarea') messageTextarea!: ElementRef<HTMLTextAreaElement>;

  private startWaveformAnimation(): void {
    if (!this.waveformContainer) return;
    const bars = this.waveformContainer.nativeElement.querySelectorAll('.waveform__bar');
    if (bars.length === 0) return;
    this.waveformTimeline = gsap.timeline({ repeat: -1 });
    bars.forEach((bar: Element, i: number) => {
      this.waveformTimeline?.to(bar, {
        height: 'random(4, 20)',
        opacity: 'random(0.3, 1)',
        duration: 0.15 + (Math.random() * 0.1),
        ease: 'power1.inOut',
        yoyo: true,
        repeat: 1
      }, i * 0.03);
    });
  }

  private stopWaveformAnimation(): void {
    this.waveformTimeline?.kill();
    this.waveformTimeline = null;
  }

  roomDisplayName = input.required<string>();
  replyTo = input<ChatMessage | null>(null);
  mentionSuggestions = input<Participant[]>([]);
  selectedMentionIndex = input<number>(0);
  isRecording = input<boolean>(false);
  formattedRecordingTime = input<string>('00:00');
  showEmojiPicker = input<boolean>(false);
  newMessage = input<string>('');
  newMessageChange = output<string>();

  cancelReply = output<void>();
  cancelRecording = output<void>();
  insertMention = output<Participant>();
  closeMentionDropdown = output<void>();
  onKeyDown = output<KeyboardEvent>();
  onType = output<void>();
  toggleEmojiPicker = output<void>();
  selectEmoji = output<string>();
  toggleRecording = output<void>();
  sendMessage = output<{ content: string, files: File[] }>();
  pendingFiles = signal<File[]>([]);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('waveformContainer') waveformContainer!: ElementRef<HTMLDivElement>;

  private waveformTimeline: gsap.core.Timeline | null = null;

  triggerFileInput(): void { this.fileInput?.nativeElement?.click(); }
  triggerImageInput(): void { this.imageInput?.nativeElement?.click(); }
  triggerCameraInput(): void { this.cameraInput?.nativeElement?.click(); }

  onFilesSelectedLocal(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
  }

  addFiles(files: File[]): void {
    this.pendingFiles.update(current => [...current, ...files]);
  }

  removeFile(index: number): void {
    this.pendingFiles.update(current => {
      const updated = [...current];
      updated.splice(index, 1);
      return updated;
    });
  }

  onKeyDownLocal(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSendMessageLocal();
    } else {
      this.onKeyDown.emit(event);
    }
  }

  onSendMessageLocal(): void {
    const content = this.newMessage().trim();
    const files = this.pendingFiles();

    if (!content && files.length === 0) return;

    this.sendMessage.emit({ content, files });
    this.pendingFiles.set([]);
  }

  onSendClick(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    const tl = gsap.timeline();
    tl.to(btn, {
      scale: 0.8,
      rotation: -15,
      duration: 0.15,
      ease: 'power2.in'
    }).to(btn, {
      scale: 1.2,
      rotation: 45,
      x: 20,
      y: -20,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out',
      onComplete: () => {
        this.onSendMessageLocal();
        gsap.set(btn, { scale: 1, rotation: 0, x: 0, y: 0, opacity: 1 });
      }
    });

    const burst = document.createElement('div');
    burst.style.cssText = 'position:absolute;width:10px;height:10px;background:var(--app-primary);border-radius:50%;pointer-events:none;';
    burst.style.left = `${btn.getBoundingClientRect().left + 20}px`;
    burst.style.top = `${btn.getBoundingClientRect().top + 20}px`;
    document.body.appendChild(burst);

    gsap.to(burst, {
      x: 'random(20, 50)',
      y: 'random(-50, -20)',
      scale: 3,
      opacity: 0,
      duration: 0.5,
      ease: 'power3.out',
      onComplete: () => burst.remove()
    });
  }

  onPasteLocal(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          const ext = item.type.split('/')[1] || 'png';
          const file = new File([blob], `clipboard_${Date.now()}.${ext}`, { type: item.type });
          this.addFiles([file]);
        }
        return;
      }
    }
  }

  onEmojiPickerSelect(event: any): void {
    const emoji = event.detail?.unicode || event.detail?.emoji;
    if (emoji) {
      this.selectEmoji.emit(emoji);
    }
    this.toggleEmojiPicker.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showEmojiPicker()) {
      const path = event.composedPath();
      const clickedInsidePicker = this.emojiPicker?.nativeElement && path.includes(this.emojiPicker.nativeElement);
      const clickedTrigger = this.emojiTrigger?.nativeElement && path.includes(this.emojiTrigger.nativeElement);

      if (!clickedInsidePicker && !clickedTrigger) {
        this.toggleEmojiPicker.emit();
      }
    }
  }
}
