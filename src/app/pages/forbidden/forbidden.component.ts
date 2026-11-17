import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [MatCardModule, TranslateModule],
  template: `
    <main class="forbidden-page">
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>403</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p role="alert">{{ 'ERRORS.FORBIDDEN' | translate }}</p>
        </mat-card-content>
      </mat-card>
    </main>
  `,
  styles: [`
    .forbidden-page { max-width: 36rem; margin: 4rem auto; padding: 0 1rem; }
    p { margin: 1rem 0; }
  `],
})
export class ForbiddenComponent {}
