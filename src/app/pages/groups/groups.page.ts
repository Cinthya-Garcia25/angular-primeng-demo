import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-groups-page',
  imports: [CardModule],
  templateUrl: './groups.page.html',
  styleUrl: './groups.page.css'
})
export class GroupsPageComponent {
  readonly totalDisplay = 'N';
}
