import { Injectable } from '@angular/core';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { Control } from '../interfaces/dialog-props';

@Injectable({
  providedIn: 'root'
})
export class FormsService {

  constructor() { }
  mainForm: FormGroup<Record<string, AbstractControl>> = new FormGroup({});

  createFormGroup(controls: Control[]) {
    controls.forEach((control) => {
      this.mainForm.addControl(
        control.controlName,
        new FormControl(
          { value: control.value, disabled: control.disabled ? control.disabled : false },
          control.validators || []
        )
      );
    });
    return this.mainForm;
  }

  setInitialValues(controlsToSetValues: string[], toponym: any) {
    controlsToSetValues.forEach((control) =>
      this.mainForm.controls[control].setValue(toponym![control])
    );
  }
}
