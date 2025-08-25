import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ZodType } from 'zod';

export function zodValidator<T>(schema: ZodType<T>): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    const result = schema.safeParse(value);
    if (!result.success) {
      console.log(result.error.issues);
/*       // Преобразуем issues в объект { поле: сообщение }
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        // issue.path — путь к ошибочному полю (массив, берем последний элемент)
        const key = issue.path.length > 0 ? issue.path.join('.') : '_error';
        errors[key] = issue.message;
      }
      console.log(errors); */
      return { zodError: result.error.issues[0].message };
    }
    return null;
  };
}
