// Angular core
import {
  Component,
  DestroyRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';

// Angular Material dialog
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';

// Material UI modules
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import {MatListModule} from '@angular/material/list';

// Services
import { TranslateModule } from '@ngx-translate/core';
import { Recipient, RecipientsShortList } from '../../../../../shared/schemas/recipient.schema';



@Component({
  selector: 'app-check-result-dialog',
  imports: [
    // Material dialog
    MatDialogActions,
    MatDialogContent,
    // Material form + UI
    MatButtonModule,
    MatGridListModule,
    MatIconModule,
    MatListModule,
    // Angular forms
    TranslateModule
  ],
  templateUrl: './check-result-dialog.component.html',
  styleUrls: ['./check-result-dialog.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class CheckResultDialogComponent {
  // Dependencies
  readonly dialogRef = inject(MatDialogRef<CheckResultDialogComponent>);
  readonly data = inject<{
    added: RecipientsShortList;
    returned: RecipientsShortList;
    absent: RecipientsShortList;
  }>(MAT_DIALOG_DATA);

  // Handle cancel
  public onCancelClick(): void {
    this.dialogRef.close();
  }
}
