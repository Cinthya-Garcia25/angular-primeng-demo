import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-landing-page',
  imports: [ButtonModule, CardModule],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.css'
})
export class LandingPageComponent {}
