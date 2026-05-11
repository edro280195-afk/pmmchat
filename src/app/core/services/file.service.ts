import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AttachmentInfo } from '../models/message.model';
import { firstValueFrom } from 'rxjs';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class FileService {
  constructor(private http: HttpClient, private injector: Injector) {}

  async uploadFile(roomId: number, messageId: number, file: File): Promise<AttachmentInfo> {
    const formData = new FormData();
    formData.append('file', file);

    return firstValueFrom(
      this.http.post<AttachmentInfo>(
        `${environment.apiUrl}/rooms/${roomId}/messages/${messageId}/attachments`,
        formData,
      ),
    );
  }

  getDownloadUrl(attachmentId: number): string {
    return `${environment.apiUrl}/files/${attachmentId}`;
  }



  // Usa HttpClient (pasa por el interceptor JWT) y evita manipular el DOM si está en Tauri
  async downloadFile(attachmentId: number, fileName?: string): Promise<void> {
    const toastService = this.injector.get(ToastService);
    
    // Iniciar con progreso 0
    const toastId = toastService.show('Descarga iniciada', `Conectando con el servidor...`, 'info', undefined, 0);

    try {
      this.http.get(this.getDownloadUrl(attachmentId), {
        responseType: 'blob',
        observe: 'events',
        reportProgress: true
      }).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.DownloadProgress) {
            const percentDone = event.total ? Math.round(100 * event.loaded / event.total) : 0;
            // Si no sabemos el total, podemos mostrar un progreso falso o la cantidad descargada
            const msg = event.total 
              ? `Descargando: ${percentDone}%` 
              : `Descargando: ${(event.loaded / 1024 / 1024).toFixed(2)} MB`;
            
            toastService.updateProgress(toastId, percentDone, msg);
          } else if (event.type === HttpEventType.Response) {
            const response = event;
            if (!response.body) return;

            if (!fileName) {
              const disposition = response.headers.get('Content-Disposition');
              if (disposition?.includes('filename=')) {
                fileName = disposition.split('filename=')[1].split(';')[0].replace(/["']/g, '').trim();
              }
            }

            toastService.updateProgress(toastId, 100, `Guardando archivo localmente...`);
            this.fallbackDownload(response.body, fileName || `file_${attachmentId}`, toastService, toastId);
          }
        },
        error: (err) => {
          console.error('Error al descargar archivo:', err);
          toastService.remove(toastId);
          toastService.show('Error de descarga', 'No se pudo descargar el archivo.', 'error');
        }
      });
    } catch (err) {
      console.error('Error al descargar archivo:', err);
      toastService.remove(toastId);
      toastService.show('Error de descarga', 'No se pudo descargar el archivo.', 'error');
    }
  }

  private fallbackDownload(blob: Blob, fileName: string, toastService: ToastService, toastId?: number) {
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(objectUrl);
    
    if (toastId !== undefined) {
      toastService.updateProgress(toastId, 100, `¡Descarga de ${fileName} completada!`);
    } else {
      toastService.show('Descarga completada', `El archivo ${fileName} se descargó.`, 'success');
    }
  }
}
