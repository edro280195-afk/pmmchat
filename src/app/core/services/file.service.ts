import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AttachmentInfo } from '../models/message.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FileService {
  constructor(private http: HttpClient) {}

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

  // Usa HttpClient (pasa por el interceptor JWT) y evita manipular el DOM
  downloadFile(attachmentId: number, fileName?: string): void {
    firstValueFrom(
      this.http.get(this.getDownloadUrl(attachmentId), {
        responseType: 'blob',
        observe: 'response',
      })
    ).then(response => {
      if (!response.body) return;

      if (!fileName) {
        const disposition = response.headers.get('Content-Disposition');
        if (disposition?.includes('filename=')) {
          fileName = disposition.split('filename=')[1].split(';')[0].replace(/["']/g, '').trim();
        }
      }

      const objectUrl = URL.createObjectURL(response.body);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName || `file_${attachmentId}`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    }).catch(err => console.error('Error al descargar archivo:', err));
  }
}
