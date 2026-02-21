import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-register-page',
  imports: [RouterLink, ButtonModule, CardModule, InputTextModule, PasswordModule],
  templateUrl: './register.page.html',
  styleUrl: './register.page.css'
})
export class RegisterPageComponent {}
