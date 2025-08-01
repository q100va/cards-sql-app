import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import {
  FormControl,
  FormsModule,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserService } from '../../../services/user.service';
import { MessageService } from 'primeng/api';
import { ErrorService } from '../../../services/error.service';

@Component({
  selector: 'app-cause-of-blocking-dialog',
  imports: [
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  providers: [MessageService],
  templateUrl: './cause-of-blocking-dialog.component.html',
  styleUrl: './cause-of-blocking-dialog.component.css',
})
export class CauseOfBlockingDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CauseOfBlockingDialogComponent>);
  readonly data = inject<{ userId: number; userName: string }>(MAT_DIALOG_DATA);
  private messageService = inject(MessageService);
  private userService = inject(UserService);
  errorService = inject(ErrorService);

  //causeOfBlocking = '';
  causeOfBlocking = new FormControl<string>('', [Validators.required]);

  onBlockUserClick() {
    this.userService
      .blockUser(this.data.userId, this.causeOfBlocking.value!)
      .subscribe({
        next: (res) => {
          this.dialogRef.close({ success: res.data });
        },
        error: (err) => this.errorService.handle(err),
      });
  }

  onCancelClick(): void {
    this.dialogRef.close({ success: false });
  }
}
