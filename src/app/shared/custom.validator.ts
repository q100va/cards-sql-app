import {
  AbstractControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export function emailFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const allowed = emailRe.test(control.value);
    return allowed || control.value == null || control.value == ''
      ? null
      : { emailFormat: true };
  };
}

export function phoneNumberFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    //const phoneRe = /^((\+7)+([0-9]){10})$/;
    //const phoneRe = /^[+]{1}([0-9\(\)\/\.\s\-]){6, 15}[0-9]{1}$/;
    const cleanValue = control.value
      ? control.value.replace(/[^0-9+]/g, '')
      : null;
    let phoneRe;
    if (cleanValue && cleanValue.startsWith('+7')) {
      phoneRe = /^((\+7)+([0-9]){10})$/;
    } else {
      phoneRe = /^\+[1-9]{1}[0-9]{0,2}[2-9]{1}[0-9]{1,2}[0-9]{3}[0-9]{4}$/;
    }
    const allowed = phoneRe.test(cleanValue);
    /*       console.log('control.value');
      console.log(control.value);
      console.log(control.value == null || control.value == ''); */

    return allowed || control.value == null || control.value == ''
      ? null
      : { phoneNumberFormat: true };
  };
}

export function telegramNicknameFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const allowed_empty = control.value == null || control.value == '';
    const nicknameRe = /^@[A-Za-z0-9_]{5,32}$/;
    const allowed_nickname = nicknameRe.test(control.value);
    return allowed_empty || allowed_nickname
      ? null
      : { telegramNicknameFormat: { value: control.value } };
  };
}

export function telegramIdFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const allowed_empty = control.value == null || control.value == '';
    const idRe = /^(\#+([0-9]){9,10})$/;
    const allowed = idRe.test(control.value);
    //console.log("control.value");
    //console.log(allowed_phone);
    // console.log(allowed_empty);
    // console.log(allowed_nickname);
    // console.log(allowed_id);

    return allowed_empty || allowed
      ? null
      : { telegramIdFormat: { value: control.value } };
  };
}

export function vKontakteFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    // const vkRe = /^https:\/\/vk.com\//;
    const vkRe =
      /^([A-Za-z0-9](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){3,30}(?:[A-Za-z0-9]))?)$/;
    const allowed = vkRe.test(control.value);
    return allowed || control.value == null || control.value == ''
      ? null
      : { vKontakteFormat: { value: control.value } };
  };
}

export function instagramFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    //const instaRe = /^https:\/\/www.instagram.com\//;
    const instaRe =
      /^([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)$/;
    const allowed = instaRe.test(control.value);
    return allowed || control.value == null || control.value == ''
      ? null
      : { instagramFormat: { value: control.value } };
  };
}

export function facebookFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    //const fbRe = /^https:\/\/www.facebook.com\//;
    const fbRe = /^[A-Za-z0-9_\.]{5,}$/;
    const allowed = fbRe.test(control.value);
    return allowed || control.value == null || control.value == ''
      ? null
      : { facebookFormat: { value: control.value } };
  };
}

export const mainContactsValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const emailError =
    control.get('email')?.hasError('required') ||
    control.get('email')?.hasError('email');
  const phoneNumberError =
    control.get('phoneNumber')?.hasError('required') ||
    control.get('phoneNumber')?.hasError('phoneNumberFormat');
  const telegramIdError =
    control.get('telegramId')?.hasError('required') ||
    control.get('telegramId')?.hasError('telegramIdFormat');
  const telegramPhoneNumberError =
    control.get('telegramPhoneNumber')?.hasError('required') ||
    control.get('telegramPhoneNumber')?.hasError('phoneNumberFormat');
  return emailError ||
    phoneNumberError ||
    telegramIdError ||
    telegramPhoneNumberError
    ? { mainContacts: true }
    : null;
};

/*
 export function minValidator(): ValidatorFn {
    return (group: FormGroup): ValidationErrors | null => {
      //const fg = ctrl as FormGroup;
      console.log("group.controls");
      console.log(group.controls);
      const controls = Object.values(group.controls);
      let result;
      if (controls.every((fc) => !fc.value)) {
        // group.setErrors({ noContacts: true });
        result = { noContacts: true };
      } else {
        //group.setErrors(null);
        result = null;
      }
      console.log("group.errors");
      console.log(group.errors);
      return result;
    };
  } */
