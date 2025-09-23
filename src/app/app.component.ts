import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { IdleService } from './services/idle.service';
import { distinctUntilChanged, map, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
  imports: [RouterOutlet],
  styles: [``],
})
export class AppComponent implements OnInit {
  private signInService = inject(AuthService);
  private translate = inject(TranslateService);
  private title = inject(Title);
  private idle = inject(IdleService);
  private subIdle?: Subscription;
  private subTranslate?: Subscription;

  constructor() {
    //this.signInService.hydrateFromSession().subscribe();
    this.subIdle = this.signInService.currentUser$
      .pipe(
        map((u) => !!u),
        distinctUntilChanged()
      )
      .subscribe((isAuthed) => {
        if (isAuthed) this.idle.start();
        else this.idle.stop();
      });
  }

  ngOnInit() {
    this.subTranslate = this.translate.onLangChange.subscribe(() => {
      this.title.setTitle(this.translate.instant('APP.TITLE'));
    });
    this.title.setTitle(this.translate.instant('APP.TITLE'));
  }

  ngOnDestroy() {
    this.subIdle?.unsubscribe();
    this.subTranslate?.unsubscribe();
  }
}
