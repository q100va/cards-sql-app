import { Component, input } from '@angular/core';

@Component({
  selector: 'app-user-columns',
  imports: [],
  templateUrl: './user-columns.component.html',
  styleUrl: './user-columns.component.css'
})
export class UserColumnsComponent {
  row = input<any>();

}
