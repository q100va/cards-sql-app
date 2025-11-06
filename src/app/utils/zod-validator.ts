import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ZodType } from 'zod';

export function zodValidator<T>(schema: ZodType<T>): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    const result = schema.safeParse(value);
    if (!result.success) {
     // console.log(result.error.issues);

      const code = result.error.issues[0]?.message ?? 'ERRORS.VALIDATION';
      return { zodError: code };
    }
    return null;
  };
}
