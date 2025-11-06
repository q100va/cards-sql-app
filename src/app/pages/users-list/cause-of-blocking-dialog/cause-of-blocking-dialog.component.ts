// src/app/pages/users-list/cause-of-blocking-dialog/cause-of-blocking-dialog.component.ts
import { Component, DestroyRef, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UserService } from '../../../services/user.service';
import { MessageWrapperService } from '../../../services/message.service';
import { causeOfRestrictionControlSchema } from '@shared/schemas/user.schema';
import { zodValidator } from '../../../utils/zod-validator';

type DialogData = { userId: number; userName: string };

@Component({
  selector: 'app-cause-of-blocking-dialog',
  standalone: true,
  imports: [
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './cause-of-blocking-dialog.component.html',
  styleUrl: './cause-of-blocking-dialog.component.css',
})
export class CauseOfBlockingDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<CauseOfBlockingDialogComponent>
  );
  private readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly userService = inject(UserService);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly destroyRef = inject(DestroyRef);

  // Keep as non-nullable string; validator guards empties/length.
  causeOfBlocking = new FormControl<string>('', {
    nonNullable: true,
    validators: [zodValidator(causeOfRestrictionControlSchema)],
  });

  onBlockUserClick(): void {
    if (this.causeOfBlocking.invalid) return;

    const cause = this.causeOfBlocking.value.trim();
    if (!cause) return;

    this.userService
      .blockUser(this.data.userId, cause)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.dialogRef.close({ refresh: res.data === null }),
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'CauseOfBlockingDialogComponent',
            stage: 'blockUser',
            userId: this.data.userId,
          }),
      });
  }

  onCancelClick(): void {
    this.dialogRef.close({ refresh: false });
  }
}
