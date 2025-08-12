import { Component, inject } from '@angular/core';
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';

import { SignInService } from '../../services/sign-in.service';

@Component({
  selector: 'app-sign-in',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    ReactiveFormsModule,
    MatButtonModule
  ],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.css',
})
export class SignInComponent {
  private signInService = inject(SignInService);

  form = new FormGroup({
    userName: new FormControl(null, Validators.compose([Validators.required])),
    password: new FormControl(null, Validators.compose([Validators.required])),
  });
  errorMessage?: string;

  constructor() {}

  onSubmit() {
    const userName = this.form.controls.userName.value;
    const password = this.form.controls.password.value;
    //console.log(userName, password);
    this.signInService.logIn(userName, password).subscribe((err: Error) => {
      this.errorMessage = err.message;
      //console.log('err');
      console.log(err);
    });
  }
}
