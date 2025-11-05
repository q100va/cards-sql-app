// src/app/shared/dialogs/details-dialogs/advances-details/advanced-details.component.ts
import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormArray,
  AbstractControl,
  FormGroup,
} from '@angular/forms';
import { ContactUrlPipe } from '../../../../utils/contact-url.pipe';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { Contacts } from '../../../../interfaces/user';
import { AdvancedModel } from '../../../../interfaces/advanced-model';
import { AddressKey, typedKeys } from '../../../../interfaces/toponym';

@Component({
  selector: 'app-advanced-details',
  standalone: true,
  imports: [],
  providers: [],
  templateUrl: './advanced-details.component.html',
  styleUrl: './advanced-details.component.css',
})
export class AdvancedDetailsComponent<
  T extends AdvancedModel
> extends BaseDetailsComponent<T> {
  private readonly contactUrl = inject(ContactUrlPipe);
  private readonly cdr = inject(ChangeDetectorRef);

  //TODO: delete ////////////////////////////////
  /*   logInvalid(ctrl: AbstractControl, path: string = ''): void {
    const here = path || '(root)';
    if (
      ctrl.invalid &&
      (ctrl.touched || ctrl.dirty || ctrl.updateOn === 'submit')
    ) {
      console.groupCollapsed('❌ Invalid:', here, '=>', ctrl.errors || {});
      console.log('errors:', ctrl.errors);
      console.log('value:', ctrl.value);

    }
    if ((ctrl as any).controls) {
      const controls =
        (ctrl as FormGroup).controls ?? (ctrl as FormArray).controls;
      for (const key of Object.keys(controls)) {
        const child = (controls as any)[key];
        const nextPath = Array.isArray(controls)
          ? `${here}[${key}]`
          : here === '(root)'
          ? key
          : `${here}.${key}`;
        this.logInvalid(child, nextPath);
      }
    }
  } */ /*     console.groupEnd();
    console.log('form.errors =', this.mainForm.errors);
    console.log('form.status =', this.mainForm.status);        // INVALID | PENDING | VALID
console.log('form.pending =', this.mainForm.pending);      // true/false*/
  /////////////////////////////////////////////////

  // Enable/disable Save button
  override checkIsSaveDisabled(): void {
    const isUser = this.data().componentType === 'user';
    // this.logInvalid(this.mainForm); //TODO: delete
    const disabled =
      (isUser && !this.mainForm.valid) ||
      (!this.changesSignal() &&
        !this.deletingSignal() &&
        this.data().operation === 'view-edit');
  //  console.log('disabled', disabled);

    this.IsSaveDisabledSignal.set(disabled);
    this.emittedIsSaveDisabled.emit(disabled);
  }

  // Optional extra validation gates (true => changes detected)
  protected override additionalValidationHooks(): boolean {
    /*     console.log(
      'this.contactsChangeValidation()',
      this.contactsChangeValidation()
    );
    console.log(
      'this.addressChangeValidation()',
      this.addressChangeValidation()
    ); */

    return this.contactsChangeValidation() || this.addressChangeValidation();
  }

  // Compare contacts between form and original orderedContacts
  private contactsChangeValidation(): boolean {
    const ordered: Contacts = this.object!['orderedContacts'];

    for (const type of this.contactTypes) {
      const original = ordered?.[type] ?? [];
      const current: string[] = this.getFormArray(type)
        .getRawValue()
        .filter(Boolean);

      // console.log('original', original);
      //  console.log('current', current);

      // lengths differ -> changed
      if (original.length !== current.length) return true;

      // content differs -> changed
      const originalSet = new Set(original.map((c) => c.content));
      const currentSet = new Set(current);

      if (originalSet.size !== currentSet.size) return true;

      for (const v of currentSet) {
        if (!originalSet.has(v)) return true;
      }
    }
    return false;
  }

  // Compare address selection against original address (country/region/district/locality)
  private addressChangeValidation(): boolean {
    const address = this.object!['address'];
    const filter = this.addressFilter();

    const keyMap: Record<
      'country' | 'region' | 'district' | 'locality',
      AddressKey
    > = {
      country: 'countries',
      region: 'regions',
      district: 'districts',
      locality: 'localities',
    };

    for (const key of typedKeys(keyMap)) {
      const originalId = address[key]?.id ?? null;
      const selectedIds = filter[keyMap[key]];
      const selectedId = Array.isArray(selectedIds)
        ? selectedIds[0] ?? null
        : null;

      if (originalId !== selectedId) return true;
    }
    return false;
  }

  // Seed form with initial values; transform contacts for view-mode
  override setInitialValues(mode: 'view' | 'edit' | 'create'): void {
    super.setInitialValues(mode);
    console.log('setInitialValues');

    const ordered = this.object!['orderedContacts'];
    const toView = (val: string, type: string) =>
      mode === 'view' ? this.contactUrl.transform(val, type) : val;

    for (const type of this.contactTypes) {
      const formArray = this.getFormArray(type);
      const values = ordered?.[type] ?? [];
      const validators =
        this.data().controls.find((c) => c.controlName === type)?.validators ||
        [];

      let diff = values.length - formArray.length;
/*       console.log('values.length', type, values.length);
      console.log('formArray.length', type, formArray.length);
      console.log('diff', type, diff); */

      while (diff > 0) {
        formArray.push(
          new FormControl(
            {
              value: null,
              disabled: mode === 'view',
            },
            validators
          )
        );
        diff--;
      }

      while (diff < 0 && formArray.length > 1) {
        formArray.removeAt(formArray.length - 1);
        diff++;
      }

      if (values.length) {
        for (let i = 0; i < values.length; i++) {
          formArray.at(i)?.setValue(toView(values[i].content, type));
        }
      } else {
        // show non-breaking space in view mode, null in edit/create
        formArray.at(0)?.setValue(mode === 'view' ? '\u00A0' : null);
        /*         formArray.push(
          new FormControl(
            {
              value: mode === 'view' ? '\u00A0' : null,
              disabled: mode === 'view',
            },
            validators
          )
        ); */
      }
    }
  }
}
