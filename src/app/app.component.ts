import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SignInService } from './services/sign-in.service';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
  imports: [RouterOutlet],
  styles: [``],
})
export class AppComponent implements OnInit {
  private signInService = inject(SignInService);
  //constructor(private signInService: SignInService) {}

  ngOnInit() {
    this.signInService.autoAuthUser();
  }
}
