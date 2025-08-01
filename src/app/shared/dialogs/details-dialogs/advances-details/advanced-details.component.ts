import { Component } from '@angular/core';
import { FormControl, FormArray } from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { AddressFilter } from '../../../../interfaces/address-filter';
import { Contacts } from '../../../../interfaces/user';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { AdvancedModel } from '../../../../interfaces/advanced-model';
import {
  AddressKey,
  ToponymType,
  typedKeys,
} from '../../../../interfaces/types';

@Component({
  selector: 'app-advanced-details',
  imports: [],
  providers: [ConfirmationService, MessageService],
  templateUrl: './advanced-details.component.html',
  styleUrl: './advanced-details.component.css',
})
export class AdvancedDetailsComponent<
  T extends AdvancedModel
> extends BaseDetailsComponent<T> {
  override checkIsSaveDisabled() {
    let condition: boolean = false;
    if (this.data().componentType == 'user') {
      condition =
        !this.mainForm.valid ||
        (!this.changesSignal() && this.data().operation == 'view-edit');
    }
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
    for (let contact of this.contactTypes) {
      const values = orderedContacts[contact];
      if (!values) {
        if (
          this.mainForm.get(contact)?.value.length > 0 &&
          this.mainForm.get(contact)?.value[0] != ''
        ) {
          return true;
        }
      } else if (values.length != this.mainForm.get(contact)?.value.length) {
        return true;
      } else {
        for (let i = 0; i < values.length; i++) {
          if (this.mainForm.get(contact)?.value[i] != values[i].content) {
            return true;
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
      if (originalId !== filteredId) {
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
    super.setInitialValues(mode, firstInitialization);

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
        const emptyValue = mode === 'view' ? '\u00A0' : '';
        formArray.at(0)?.setValue(emptyValue);
      }
    }
  }
}
