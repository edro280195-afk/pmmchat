import { Directive, ElementRef, Input, AfterViewInit } from '@angular/core';
import gsap from 'gsap';

@Directive({
  selector: '[appMessageFlight]',
  standalone: true
})
export class MessageFlightDirective implements AfterViewInit {
  @Input('appMessageFlight') status: string | undefined = '';
  @Input() isOwn: boolean = false;

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    // Solo aplicar el vuelo a mensajes propios que acaban de ser enviados ('sending')
    if (this.isOwn && this.status === 'sending') {
      // Desactivamos la animación CSS por defecto para tomar el control con GSAP
      this.el.nativeElement.style.animation = 'none';

      // El mensaje vuela desde la posición aproximada del input (100px abajo)
      gsap.fromTo(this.el.nativeElement, 
        { 
          y: 100, 
          x: 30, // Ligeramente desplazado a la derecha como si saliera del botón de enviar
          scale: 0.8, 
          opacity: 0,
          transformOrigin: 'right bottom'
        },
        {
          y: 0,
          x: 0,
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: 'back.out(1.2)'
        }
      );
    }
  }
}
