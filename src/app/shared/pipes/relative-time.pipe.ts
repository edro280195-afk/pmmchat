import { Pipe, PipeTransform } from '@angular/core';
import {
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';

@Pipe({ name: 'relativeTime', standalone: true })
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    // Normalizar: si tiene espacio/T pero no termina en Z, es UTC del API sin marcar.
    const normalized = (value.includes('T') || value.includes(' ')) && !value.endsWith('Z') 
      ? value.replace(' ', 'T') + 'Z' 
      : value;

    const date = new Date(normalized);
    if (isNaN(date.getTime())) return '';

    if (isToday(date)) {
      // "hace 5 minutos", "hace 2 horas"
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    }

    if (isYesterday(date)) {
      return 'ayer';
    }

    if (isThisWeek(date, { locale: es })) {
      // "lun", "mar", "mié"...
      return format(date, 'EEE', { locale: es });
    }

    // Más de una semana: "28 abr"
    return format(date, 'd MMM', { locale: es });
  }
}
