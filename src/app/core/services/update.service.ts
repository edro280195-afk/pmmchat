import { Injectable, inject } from '@angular/core';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

@Injectable({
  providedIn: 'root'
})
export class UpdateService {
  constructor() {
    this.checkForUpdates();
  }

  async checkForUpdates() {
    try {
      console.log('Buscando actualizaciones...');
      const update = await check();
      
      if (update) {
        console.log(`Actualización encontrada: ${update.version} de ${update.date}`);
        
        let downloaded = 0;
        let contentLength: number | undefined = 0;

        // Descargar e instalar en segundo plano
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength;
              console.log(`Iniciando descarga de ${contentLength} bytes`);
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              console.log(`Descargado: ${downloaded} / ${contentLength}`);
              break;
            case 'Finished':
              console.log('Descarga finalizada. La aplicación se actualizará al reiniciar.');
              break;
          }
        });

        // Opcional: Podrías forzar el reinicio aquí si quisieras, 
        // pero "en silencio" suele significar que se aplique la próxima vez que abran.
        // await relaunch();
      } else {
        console.log('La aplicación está actualizada.');
      }
    } catch (error) {
      console.error('Error al buscar actualizaciones:', error);
    }
  }
}
