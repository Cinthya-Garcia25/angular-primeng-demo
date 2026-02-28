import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() logoutRequested = new EventEmitter<void>();

  readonly isLoggedIn = !!sessionStorage.getItem('authUser');
  readonly appVersion = 'v1.0.0';

  requestLogout(): void {
    this.logoutRequested.emit();
  }
}
