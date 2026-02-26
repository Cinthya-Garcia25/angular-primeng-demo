import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';

interface FeatureCard {
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-home-page',
  imports: [FormsModule, RouterLink, CardModule, InputTextModule, ButtonModule, MenuModule],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePageComponent {
  search = '';
  readonly isLoggedIn = !!sessionStorage.getItem('authUser');

  readonly quickMenuItems: MenuItem[] = [
    { label: 'Nuevo proyecto', icon: 'pi pi-plus-circle' },
    { label: 'Ver reportes', icon: 'pi pi-chart-bar' },
    { label: 'Gestion de usuarios', icon: 'pi pi-users' }
  ];

  readonly cards: FeatureCard[] = [
    {
      title: 'Panel de ventas',
      description: 'Consulta resultados del dia y compara metricas de rendimiento.',
      icon: 'pi pi-chart-line'
    },
    {
      title: 'Gestor de tareas',
      description: 'Asigna pendientes y revisa estados en tiempo real con tu equipo.',
      icon: 'pi pi-check-square'
    },
    {
      title: 'Soporte al cliente',
      description: 'Centraliza tickets abiertos y responde mas rapido a cada solicitud.',
      icon: 'pi pi-headset'
    }
  ];

  get filteredCards(): FeatureCard[] {
    const value = this.search.trim().toLowerCase();
    if (!value) {
      return this.cards;
    }

    return this.cards.filter(
      (card) =>
        card.title.toLowerCase().includes(value) || card.description.toLowerCase().includes(value)
    );
  }
}
