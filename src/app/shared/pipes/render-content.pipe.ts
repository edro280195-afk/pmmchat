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
      return `<a href="${cleanUrl}" data-url="${cleanUrl}" onclick="window.openLink(event)" class="chat-link">${cleanUrl}</a>${suffix}`;
    });

    // Detectar correos electrónicos y convertirlos en enlaces mailto:
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    escaped = escaped.replace(emailRegex, (email) => {
      return `<a href="mailto:${email}" class="chat-link email-link">${email}</a>`;
    });

    // El regex solo captura caracteres de palabra, punto, guión y letras con tilde —
    // Solo permitimos menciones que tengan un espacio (o inicio de línea) antes del @
    // para evitar capturar los dominios de los correos electrónicos ya convertidos a HTML.
    const withMentions = escaped.replace(/(^|\s)@([\w.\-\u00C0-\u017F]+)/g, (_match, space, name) => {
      const isSelf = name.toLowerCase() === myClaveUsuario.toLowerCase();
      const cls = isSelf ? 'mention mention--self' : 'mention';
      return `${space}<span class="${cls}">@${name}</span>`;
    });

    // El resultado ya es seguro porque los caracteres especiales del usuario fueron escapados al inicio.
    // Solo permitimos el HTML inyectado por las regex (enlaces y menciones).
    return this.sanitizer.bypassSecurityTrustHtml(withMentions);
  }
}
