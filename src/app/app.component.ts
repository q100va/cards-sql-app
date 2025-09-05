import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SignInService } from './services/sign-in.service';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
  imports: [RouterOutlet],
  styles: [``],
})
export class AppComponent implements OnInit {
  private signInService = inject(SignInService);
  private translate = inject(TranslateService);
  private title = inject(Title);
  //constructor(private signInService: SignInService) {}

  ngOnInit() {
    this.signInService.autoAuthUser();
    this.translate.onLangChange.subscribe(() => {
      this.title.setTitle(this.translate.instant('APP.TITLE'));
    });
    this.title.setTitle(this.translate.instant('APP.TITLE'));
  }
}
