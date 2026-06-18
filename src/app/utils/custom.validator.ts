import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { ContactType } from '../interfaces/advanced-model';

export const mainUserContactsValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const formArrayEmail = control.get('email') as FormArray;
  const formArrayPhoneNumber = control.get('phoneNumber') as FormArray;
  const formArrayTelegramId = control.get('telegramId') as FormArray;
  const formArrayTelegramPhoneNumber = control.get(
    'telegramPhoneNumber',
  ) as FormArray;

  const emailError = formArrayEmail.controls.some(
    (control) => control.errors !== null,
  );
  const phoneNumberError = formArrayPhoneNumber.controls.some(
    (control) => control.errors !== null,
  );
  const telegramIdError = formArrayTelegramId.controls.some(
    (control) => control.errors !== null,
  );
  const telegramPhoneNumberError = formArrayTelegramPhoneNumber.controls.some(
    (control) => control.errors !== null,
  );

  return emailError ||
    phoneNumberError ||
    telegramIdError ||
    telegramPhoneNumberError
    ? { mainContacts: true }
    : null;
};

export const mainPartnerContactsValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const possibleContactTypes: Exclude<ContactType, 'telegram'>[] = [
    'email',
    'phoneNumber',
    'telegramId',
    'telegramPhoneNumber',
    'telegramNickname',
    'whatsApp',
    'vKontakte',
    'instagram',
    'facebook',
    'website',
    'otherContact',
  ];
  for (const type of possibleContactTypes) {
    const formArray = control.get(type) as FormArray;
    const noContact = formArray.controls.some(
      (control) => control.value == null || control.value.trim == '',
    );
    // console.log("noContact", noContact)
    if (!noContact) return null;
  }
  return { mainContacts: true };
};

export function genderAmountSumValidator(
  amountControl: FormControl<number | null>,
) {
  return (form: AbstractControl): ValidationErrors | null => {
    const gender = form.get('gender')?.value;
    const male = form.get('maleAmount')?.value;
    const female = form.get('femaleAmount')?.value;
    const amount = amountControl.value;

    if (gender !== 4) {
      return null;
    }

    if (amount === null || male === null || female === null) {
      return { genderAmountSum: true };
    }

    return male + female === amount ? null : { genderAmountSum: true };
  };
}

export function houseAmountValidator(
  amountControl: FormControl<number | null>,
) {
  return (form: AbstractControl): ValidationErrors | null => {
    const amount = amountControl.value;

    const maxNoAddressControl = form.get('maxNoAddress');
    const minControl = form.get('minFromOneHouse');
    const maxControl = form.get('maxFromOneHouse');

    const maxNoAddress = maxNoAddressControl?.value;
    const min = minControl?.value;
    const max = maxControl?.value;

    if (amount === null) {
      return null;
    }

    const errors: ValidationErrors = {};

    if (
      maxNoAddressControl?.enabled &&
      maxNoAddress !== null &&
      maxNoAddress > amount
    ) {
      errors['maxNoAddressTooBig'] = true;
    }

    if (min !== null && min > amount) {
      errors['minFromOneHouseTooBig'] = true;
    }

    if (max !== null && max > amount) {
      errors['maxFromOneHouseTooBig'] = true;
    }
/*     if (max === null && min !== null) {
      const possible = isHouseDistributionPossible(amount, min, 0);
      if (!possible) {
        errors['impossibleHouseDistribution'] = true;
      }
    } */

    if (min !== null && max !== null) {
      if (min > max) {
        errors['minGreaterThanMax'] = true;
      } else {
        const possible = isHouseDistributionPossible(amount, min, max);

        if (!possible) {
          errors['impossibleHouseDistribution'] = true;
        }
      }
    }

    return Object.keys(errors).length ? errors : null;
  };
}

function isHouseDistributionPossible(
  amount: number,
  min: number,
  max: number,
): boolean {
  if (min <= 0 || max <= 0 || min > max || amount <= 0) {
    return false;
  }

  const minHouses = Math.ceil(amount / max);
  const maxHouses = Math.floor(amount / min);

  return minHouses <= maxHouses;
}

export function dateYearRangeValidator() {
  return (form: AbstractControl): ValidationErrors | null => {
    const date1 = form.get('date1')?.value;
    const date2 = form.get('date2')?.value;

    const year1 = form.get('year1')?.value;
    const year2 = form.get('year2')?.value;

    const errors: ValidationErrors = {};

    if (date1 !== null && date2 !== null && date1 > date2) {
      errors['invalidDateRange'] = true;
    }

    if (year1 !== null && year2 !== null && year1 > year2) {
      errors['invalidYearRange'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  };
}
