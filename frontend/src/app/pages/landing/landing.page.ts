import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, ButtonModule, CardModule],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.css'
})
export class LandingPageComponent {}
