import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { sanitizeText } from '../utils/sanitize-text';

export type ConfirmKind = 'address' | 'names' | 'userName' | 'contact';

@Injectable({ providedIn: 'root' })
export class DiffConfirmService {
  private readonly confirm = inject(ConfirmationService);
  private readonly t = inject(TranslateService);

  /** Ask: move previous value to 'outdated' (Accept) or delete it (Reject). */
  confirmOutdateOrDelete(kind: ConfirmKind, value: string): Promise<boolean> {
    const kindLabel = {
      address: this.t.instant('PRIME_CONFIRM.DATA_TYPES.ADDRESS'),
      names: this.t.instant('PRIME_CONFIRM.DATA_TYPES.NAMES'),
      userName: this.t.instant('PRIME_CONFIRM.DATA_TYPES.USER_NAME'),
      contact: this.t.instant('PRIME_CONFIRM.DATA_TYPES.CONTACTS'),
    }[kind];

    const header = this.t.instant('PRIME_CONFIRM.WARNING_HEADER');
    const message = this.t.instant('PRIME_CONFIRM.SAVE_OR_DELETE_OLD_DATA', {
      type: kindLabel,
      oldValue: sanitizeText(value),
    });

    return new Promise<boolean>((resolve) => {
      this.confirm.confirm({
        header,
        message,
        closable: false,
        closeOnEscape: false,
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: {
          label: this.t.instant('PRIME_CONFIRM.REJECT'),
          severity: 'secondary',
          outlined: true,
        }, // delete
        acceptButtonProps: {
          label: this.t.instant('PRIME_CONFIRM.ACCEPT'), // move to outdated
        },
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }

  /** Ask:  is correct new data when it matches outdated records.
   * (Accept) - restore it or (Reject) - cancel saving. */
  confirmDataCorrectness(
    type: 'address' | 'names' | 'userName' | 'contacts',
    value: string
  ): Promise<boolean> {
    const types = {
      address: this.t.instant('PRIME_CONFIRM.DATA_TYPES.ADDRESS'),
      names: this.t.instant('PRIME_CONFIRM.DATA_TYPES.NAMES'),
      userName: this.t.instant('PRIME_CONFIRM.DATA_TYPES.USER_NAME'),
      contacts: this.t.instant('PRIME_CONFIRM.DATA_TYPES.CONTACTS'),
    };

    return new Promise((resolve) => {
      const safeValue = sanitizeText(value);
      this.confirm.confirm({
        message: this.t.instant('PRIME_CONFIRM.OUTDATED_DUPLICATES', {
          type: types[type],
          value: safeValue,
        }),
        header: this.t.instant('PRIME_CONFIRM.WARNING_HEADER'),
        closable: false,
        closeOnEscape: false,
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: {
          label: this.t.instant('PRIME_CONFIRM.REJECT'),
        },
        acceptButtonProps: {
          label: this.t.instant('PRIME_CONFIRM.ACCEPT'),
          severity: 'secondary',
          outlined: true,
        },
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
