import { Component, ChangeDetectionStrategy, input, output, ViewChild, ElementRef, signal, effect, OnInit, AfterViewChecked, NO_ERRORS_SCHEMA, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Participant } from '../../../../../core/models/room.model';
import { ChatMessage } from '../../../../../core/models/message.model';
import { AutoResizeDirective } from '../../../../../shared/directives/auto-resize.directive';
import { FileSizePipe } from '../../../../../shared/pipes/file-size.pipe';
import { FloatingUiService } from '../../../../../core/services/floating-ui.service';
import { ToastService } from '../../../../../core/services/toast.service';
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
  private toastService = inject(ToastService);
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
    const allowedExtensions = ['jpg', 'jpeg', 'txt', 'pdf', 'zip'];
    const filtered = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return allowedExtensions.includes(ext);
    });

    if (filtered.length < files.length) {
      this.toastService.show(
        'Formato no permitido', 
        'Solo se permiten imágenes JPEG y documentos PDF, TXT o ZIP.', 
        'warning'
      );
    }

    if (filtered.length > 0) {
      this.pendingFiles.update(current => [...current, ...filtered]);
    }
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
      if (this.mentionSuggestions().length > 0) {
        // Dejar que conversation.ts maneje el Enter para la mención
        this.onKeyDown.emit(event);
      } else {
        event.preventDefault();
        this.onSendMessageLocal();
      }
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
    // Enviar el mensaje inmediatamente
    this.onSendMessageLocal();
  }

  onPasteLocal(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Solo permitir JPEG (image/jpeg)
      if (item.type === 'image/jpeg' || item.type === 'image/jpg') {
        event.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          const file = new File([blob], `clipboard_${Date.now()}.jpg`, { type: 'image/jpeg' });
          this.addFiles([file]);
        }
        return;
      } else if (item.type.startsWith('image/')) {
        // Bloquear otras imágenes con aviso
        event.preventDefault();
        this.toastService.show('Formato no permitido', 'Solo se permite pegar imágenes JPEG.', 'warning');
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
