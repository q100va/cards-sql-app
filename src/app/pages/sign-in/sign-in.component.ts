import { Component, inject } from '@angular/core';
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

import { SignInService } from '../../services/sign-in.service';
import { MessageWrapperService } from '../../services/message.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-sign-in',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    ReactiveFormsModule,
    MatButtonModule,
    TranslateModule,
  ],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.css',
})
export class SignInComponent {
  private signInService = inject(SignInService);
  private router = inject(Router);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly translateService = inject(TranslateService);
  isLoad = false;

  form = new FormGroup({
    userName: new FormControl<string>('', Validators.compose([Validators.required])),
    password: new FormControl<string>('', Validators.compose([Validators.required])),
  });
  errorMessage?: string;

  constructor() {}

  onSubmit() {
    this.isLoad = true;
    const userName = this.form.controls.userName.value ?? '';
    const password = this.form.controls.password.value ?? '';

    this.signInService.logIn(userName, password).subscribe({
      next: () => {
        this.form.reset();
        this.isLoad = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoad = false;
        let key = 'ERRORS.UNAUTHORIZED';
        let params: any = {};
        if (err?.error?.code) {
          key = err.error.code;
        } else if (err?.status === 401) {
          key = 'ERRORS.INVALID_AUTHORIZATION'; // единое сообщение
        } else if (err?.status === 423) {
          key = 'ERRORS.ACCOUNT_LOCKED'; // без деталей “почему”
        } else if (err?.status === 429) {
          key = 'ERRORS.TOO_MANY_ATTEMPTS';
        }
        if (err?.status === 429) {
          params.retryAfterSec =
            err?.error?.data?.retryAfterSec ??
            Number(err?.headers?.get?.('Retry-After')) ??
            60;
        }

        this.errorMessage = this.translateService.instant(key, params);
        this.msgWrapper.handle(err, { source: 'SignIn', stage: 'logIn' });
      },

    });
  }
}
