import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized-page',
  standalone: true,
  imports: [CardModule, ButtonModule],
  templateUrl: './unauthorized.page.html',
  styleUrl: './unauthorized.page.css'
})
export class UnauthorizedPageComponent {
  constructor(private readonly router: Router) {}

  goHome(): void {
    this.router.navigate(['/pages/home']);
  }
}


