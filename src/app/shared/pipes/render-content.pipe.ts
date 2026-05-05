import { Pipe, PipeTransform, inject, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';

@Pipe({
  name: 'renderContent',
  standalone: true
})
export class RenderContentPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);
  private authService = inject(AuthService);

  transform(content: string | null | undefined): SafeHtml {
    if (!content) return '';

    const myClaveUsuario = this.authService.user()?.claveUsuario ?? '';

    // Escapar todos los caracteres HTML peligrosos antes de construir el markup
    let escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    // Detectar URLs y convertirlas en enlaces clickeables
    // Regex conservador: captura http(s):// seguido de caracteres válidos de URL
    const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
    escaped = escaped.replace(urlRegex, (url) => {
      // Limpiar puntuación final que probablemente no es parte de la URL
      let cleanUrl = url;
      const trailingPunctuation = /[.,;:!?)]+$/;
      const match = cleanUrl.match(trailingPunctuation);
      let suffix = '';
      if (match) {
        suffix = match[0];
        cleanUrl = cleanUrl.slice(0, -suffix.length);
      }
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="chat-link">${cleanUrl}</a>${suffix}`;
    });

    // El regex solo captura caracteres de palabra, punto, guión y letras con tilde —
    // nunca puede contener comillas ni ángulos, por lo que el span generado es seguro.
    const withMentions = escaped.replace(/@([\w.\-\u00C0-\u017F]+)/g, (_match, name) => {
      const isSelf = name.toLowerCase() === myClaveUsuario.toLowerCase();
      const cls = isSelf ? 'mention mention--self' : 'mention';
      return `<span class="${cls}">@${name}</span>`;
    });

    // Pasar por el sanitizador de Angular como red de seguridad adicional,
    // luego marcar el resultado limpio como de confianza para [innerHTML].
    const clean = this.sanitizer.sanitize(SecurityContext.HTML, withMentions) ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }
}
