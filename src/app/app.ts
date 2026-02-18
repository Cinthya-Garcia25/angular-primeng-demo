import { Component, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-root',
  imports: [ButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly mensaje = signal('Haz clic en el boton');

  protected mostrarMensaje(): void {
    this.mensaje.set('PrimeNG integrado correctamente');
  }
}
