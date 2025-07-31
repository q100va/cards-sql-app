import {
  Component,
} from '@angular/core';
import {
  FormControl,
  FormArray,
} from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { AddressFilter } from '../../../../interfaces/address-filter';
import {
  Contacts,
} from '../../../../interfaces/user';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { AdvancedModel } from '../../../../interfaces/advanced-model';

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
    const keyMap = {
      country: 'countries',
      region: 'regions',
      district: 'districts',
      locality: 'localities',
    };
    const keys: (keyof typeof keyMap)[] = [
      'country',
      'region',
      'district',
      'locality',
    ];
    for (const key of keys) {
      const original = address[key];
      const filtered = filter[keyMap[key] as keyof AddressFilter];
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
  controlsToSetValues: string[],
  mode: 'view' | 'edit' | 'create',
  firstInitialization = false){
    super.setInitialValues(controlsToSetValues, mode, firstInitialization);

      const orderedContacts = this.object!['orderedContacts'];
      for (let contact of this.contactTypes) {
        const formArray = this.mainForm.get(contact) as FormArray;
        ////console.log('formArray', formArray);
        ////console.log('this.object![contact]', this.object);

        const values = orderedContacts[
          contact as keyof typeof orderedContacts
        ] as unknown as { id: number; content: string }[];
        // //console.log('contact', contact, values);
        // //console.log('formArray', formArray.at(0), values);

        if (values) {
          if (firstInitialization) {
            formArray
              .at(0)
              ?.setValue(
                mode == 'view'
                  ? this.editContact(values[0].content, contact)
                  : values[0].content
              );
            for (let i = 1; i < values.length; i++) {
              formArray.push(
                new FormControl(
                  {
                    value:
                      mode == 'view'
                        ? this.editContact(values[i].content, contact)
                        : values[i].content,
                    disabled: true,
                  },
                  this.data().controls.find(
                    (control) => control.controlName == contact
                  )?.validators || []
                )
              );
            }
          } else {
            for (let i = 0; i < values.length; i++) {
              formArray
                .at(i)
                ?.setValue(
                  mode == 'view'
                    ? this.editContact(values[i].content, contact)
                    : values[i].content
                );
            }
          }
        } else if (mode == 'view') {
          // //console.log('Non-breaking space for empty values');
          formArray.at(0)?.setValue('\u00A0'); // Non-breaking space for empty values
        } else {
          formArray.at(0)?.setValue('');
        }
      }

  }
}
