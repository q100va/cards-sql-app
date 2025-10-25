import { Component } from '@angular/core';
import { FormControl, FormArray, AbstractControl, FormGroup } from '@angular/forms';
import { Contacts } from '../../../../interfaces/user';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { AdvancedModel } from '../../../../interfaces/advanced-model';
import {
  AddressKey,
  typedKeys,
} from '../../../../interfaces/toponym';

@Component({
  selector: 'app-advanced-details',
  imports: [],
providers: [],
  templateUrl: './advanced-details.component.html',
  styleUrl: './advanced-details.component.css',
})
export class AdvancedDetailsComponent<
  T extends AdvancedModel
> extends BaseDetailsComponent<T> {

logInvalid(ctrl: AbstractControl, path: string = ''): void {
  const here = path || '(root)';
  if (ctrl.invalid && (ctrl.touched || ctrl.dirty || ctrl.updateOn === 'submit')) {
    console.groupCollapsed('❌ Invalid:', here, '=>', ctrl.errors || {});
    console.log('errors:', ctrl.errors);
    console.log('value:', ctrl.value);
    console.groupEnd();
  }
    if ((ctrl as any).controls) {
    const controls = (ctrl as FormGroup).controls ?? (ctrl as FormArray).controls;
    for (const key of Object.keys(controls)) {
      const child = (controls as any)[key];
      const nextPath = Array.isArray(controls) ? `${here}[${key}]` : (here === '(root)' ? key : `${here}.${key}`);
      this.logInvalid(child, nextPath);
    }
  }
}



  override checkIsSaveDisabled() {

    let condition: boolean = false;
    if (this.data().componentType == 'user') {
      condition =
        !this.mainForm.valid ||
        (!this.changesSignal() && this.data().operation == 'view-edit');
    }

    this.logInvalid(this.mainForm);

    console.log('this.mainForm.valid ',this.mainForm.valid);
    console.log('this.changesSignal() ',this.changesSignal());
     console.log('checkIsSaveDisabled ',condition);
    this.IsSaveDisabledSignal.set(condition);
    this.emittedIsSaveDisabled.emit(condition);
  }

  protected override additionalValidationHooks(): boolean {
    let changes = this.contactsChangeValidation();
    if (!changes) {
      changes = this.addressChangeValidation();
    }
    return changes;
  }

  contactsChangeValidation() {
    const orderedContacts: Contacts = this.object!['orderedContacts'];
    for (let type of this.contactTypes) {
      const values = orderedContacts[type];
      const rawControlValue: string[] = this.getFormArray(type)
        .getRawValue()
        .filter(Boolean);
  console.log('orderedContacts[contact]', type, values);
      console.log('rawControlValue', rawControlValue);
      if (!values) {
        console.log(
          'this.mainForm.get(contact)?.value.length',
          this.mainForm.get(type)?.value.length
        );
       console.log(
          'this.mainForm.get(contact)?.value',
          this.mainForm.get(type)?.value
        );
        if (rawControlValue.length > 0) {
          return true;
        }
      } else if (values.length != rawControlValue.length) {
         console.log(
          'contactsChangeValidation - values.length != this.mainForm.get(contact)?.value.length',
          values.length != this.mainForm.get(type)?.value.length
        );
        return true;
      } else {
        for (const contact of rawControlValue) {
          const indexInOldContactsArray = orderedContacts[type]?.findIndex(
            (item) => item.content == contact
          );
          console.log('indexInOldContactsArray', indexInOldContactsArray);
          if (!orderedContacts[type] || indexInOldContactsArray == -1) {
            return true;
          }
        }

        if (Array.isArray(orderedContacts[type])) {
          for (const contact of orderedContacts[type]) {
            const indexInNewContactsArray = rawControlValue.findIndex(
              (item) => item == contact.content
            );
            if (indexInNewContactsArray == -1) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  addressChangeValidation() {
    const address = this.object!['address'];
    const filter = this.addressFilter();
    const keyMap: {
      country: AddressKey;
      region: AddressKey;
      district: AddressKey;
      locality: AddressKey;
    } = {
      country: 'countries',
      region: 'regions',
      district: 'districts',
      locality: 'localities',
    };
    for (const key of typedKeys(keyMap)) {
      const original = address[key];
      const filtered = filter[keyMap[key]];
      const originalId = original?.id ?? null;
      const filteredId = Array.isArray(filtered) ? filtered[0] ?? null : null;
      if (originalId != filteredId) {
       console.log('originalId != filteredId', originalId, filteredId);
        return true;
      }
    }
    return false;
  }

  editContact(value: string, type: string) {
    let result = '';
    //TODO: move this logic to a service
    switch (type) {
      case 'vKontakte':
        result = 'https://vk.com/' + value;
        break;
      case 'instagram':
        result = 'https://www.instagram.com/' + value;
        break;
      case 'facebook':
        result = 'https://www.facebook.com/' + value;
        break;
      /*       case 'phoneNumber':
        result = value.trim().replace(/[^0-9+]/g, '');
        break;
      case 'telegramPhoneNumber':
        result = value.trim().replace(/[^0-9+]/g, '');
        break;
      case 'whatsApp':
        result = value.trim().replace(/[^0-9+]/g, '');
        break; */
      default:
        result = value;
    }
    //  //console.log('editContact', type, value, result);
    return result;
  }

  override setInitialValues(
    //   controlsToSetValues: string[],
    mode: 'view' | 'edit' | 'create',
    firstInitialization = false
  ) {
    super.setInitialValues(mode);//, firstInitialization

    const orderedContacts = this.object!['orderedContacts'];

    for (let contact of this.contactTypes) {
      const formArray = this.mainForm.get(contact) as FormArray;
      const values = orderedContacts[contact];

      const transform = (val: string) =>
        mode === 'view' ? this.editContact(val, contact) : val;

      if (values?.length) {
        if (firstInitialization) {
          values.forEach((v, i) => {
            const value = transform(v.content);

            if (i === 0) {
              formArray.at(0)?.setValue(value);
            } else {
              const validators =
                this.data().controls.find((c) => c.controlName === contact)
                  ?.validators || [];

              formArray.push(
                new FormControl({ value, disabled: true }, validators)
              );
            }
          });
        } else {
          values.forEach((v, i) => {
            formArray.at(i)?.setValue(transform(v.content));
          });
        }
      } else {
        const emptyValue = mode === 'view' ? '\u00A0' : null;
        formArray.at(0)?.setValue(emptyValue);
      }
    }
  }
}
