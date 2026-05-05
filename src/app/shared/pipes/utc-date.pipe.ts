import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';

@Pipe({
  name: 'utcDate',
  standalone: true
})
export class UtcDatePipe implements PipeTransform {
  transform(value: string | null | undefined, format: string = 'HH:mm'): string {
    if (!value) return '';

    // Normalizar: si tiene espacio/T pero no termina en Z, es UTC del API sin marcar.
    const normalized = (value.includes('T') || value.includes(' ')) && !value.endsWith('Z') 
      ? value.replace(' ', 'T') + 'Z' 
      : value;

    const date = new Date(normalized);
    if (isNaN(date.getTime())) return '';

    // Usar el formatDate de Angular para consistencia
    return formatDate(date, format, 'en-US');
  }
}
