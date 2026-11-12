import { FormControl } from '@angular/forms';
import { coordinationNameControlSchema } from '../../../shared/schemas/common.schema';
import { zodValidator } from './zod-validator';

describe('coordination selection validation', () => {
  it('requires a selected coordination instead of unselected autocomplete text', () => {
    const control = new FormControl<unknown>('Test Home', zodValidator(coordinationNameControlSchema));
    expect(control.errors).toEqual({ zodError: 'FORM_VALIDATION.REQUIRED' });

    control.setValue({ id: 1, name: 'Test Home' });
    expect(control.valid).toBeTrue();
    expect(control.errors).toBeNull();
  });

  it('keeps an empty coordination selection required', () => {
    const control = new FormControl<unknown>(null, zodValidator(coordinationNameControlSchema));
    expect(control.errors).toEqual({ zodError: 'FORM_VALIDATION.REQUIRED' });
  });
});
