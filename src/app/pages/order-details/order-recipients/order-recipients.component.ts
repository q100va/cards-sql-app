import { Component, inject, input } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Clipboard } from '@angular/cdk/clipboard';

import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  OrderRecipient,
  OrderRecipients,
} from '../../../../../shared/schemas/order.schema';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  getDobroruInstruction,
  getFullInstruction,
  getSchoolInstruction,
  getShortInstruction,
} from '../../../utils/order-ctrls';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-order-recipients',
  imports: [
    TranslateModule,
    MatGridListModule,
    MatSlideToggleModule,
    FormsModule,
    ReactiveFormsModule,
    NgClass,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './order-recipients.component.html',
  styleUrl: './order-recipients.component.css',
})
export class OrderRecipientsComponent {
  readonly translateService = inject(TranslateService);
  readonly authService = inject(AuthService);
  private readonly clipboard = inject(Clipboard);
  list = input.required<OrderRecipients>();
  volunteerName = input.required<string>();
  occasionName = input.required<string>();
  forInstitute = input.required<boolean>();

  showIndexes = false;
  showFullInstruction = false;
  showShortInstruction = false;
  flag = false;
  fullInstruction: {
    text: string;
    className: string;
    part: 'top' | 'bottom';
  }[] = [];
  shortInstruction: {
    text: string;
    className: string;
    part: 'top' | 'bottom';
  }[] = [];
  topParts: {
    text: string;
    className: string;
    part: 'top' | 'bottom';
    prefix?: string;
  }[] = [];
  bottomParts: {
    text: string;
    className: string;
    part: 'top' | 'bottom';
    prefix?: string;
  }[] = [];

  settingsForm = new FormGroup({
    showIndexes: new FormControl(false, { nonNullable: true }),
    newerInstruction: new FormControl(false, { nonNullable: true }),
    subscriberInstruction: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit() {
    this.flag = this.authService.has('FULL_FILTER_NEW_ORDER');
    this.fullInstruction = this.flag
      ? getFullInstruction(this.volunteerName())
      : this.forInstitute()
        ? getSchoolInstruction(this.volunteerName())
        : getDobroruInstruction(this.volunteerName());
    this.shortInstruction = getShortInstruction(this.volunteerName());
    this.settingsForm.controls['showIndexes'].valueChanges.subscribe(
      (value) => (this.showIndexes = value),
    );

    this.settingsForm.controls['newerInstruction'].valueChanges.subscribe(
      (value) => this.onSlideToggleChangeInstruction('newer', value),
    );

    this.settingsForm.controls['subscriberInstruction'].valueChanges.subscribe(
      (value) => this.onSlideToggleChangeInstruction('subscriber', value),
    );
  }

  fullDayBirthday(recipient: OrderRecipient) {
    if (this.translateService.getCurrentLang() === 'ru') {
      return `${
        recipient.birthDay > 9 ? recipient.birthDay : '0' + recipient.birthDay
      }.${
        recipient.birthMonth > 9
          ? recipient.birthMonth
          : '0' + recipient.birthMonth
      }${recipient.birthYear > 1800 ? '.' + recipient.birthYear : ''}`;
    } else {
      return `${recipient.birthYear > 1800 ? recipient.birthYear : '????'}/
      ${recipient.birthMonth}/${recipient.birthDay}`;
    }
  }

  onSlideToggleChangeInstruction(
    type: 'subscriber' | 'newer',
    checked: boolean,
  ) {
    if (type === 'newer') {
      this.showFullInstruction = checked;
      if (checked) {
        this.topParts = this.fullInstruction.filter((i) => i.part === 'top');
        this.bottomParts = this.fullInstruction.filter(
          (i) => i.part === 'bottom',
        );
        this.showShortInstruction = false;
        this.settingsForm.controls['subscriberInstruction'].setValue(false, {
          emitEvent: false,
        });
      }
    }
    if (type === 'subscriber') {
      this.showShortInstruction = checked;
      if (checked) {
        this.topParts = this.shortInstruction.filter((i) => i.part === 'top');
        this.bottomParts = this.shortInstruction.filter(
          (i) => i.part === 'bottom',
        );
        this.showFullInstruction = false;
        this.settingsForm.controls['newerInstruction'].setValue(false, {
          emitEvent: false,
        });
      }
    }
  }
  copyAddressesToClipboard() {
    const text = this.buildClipboardText();
    this.clipboard.copy(text);
  }
  buildClipboardText(): string {
    let top = this.topParts
      .map((i) => (i.prefix ? i.prefix + ' ' + i.text : i.text))
      .filter(Boolean)
      .join('\n');
    let addresses = this.getRecipients();
    let bottom = this.bottomParts
      .map((i) => (i.prefix ? i.prefix + ' ' + i.text : i.text))
      .filter(Boolean)
      .join('\n');
    return top + '\n\n' + addresses + bottom;
  }

  getRecipients() {
    let addresses = '';
    for (let home of this.list()) {
      const infoNote =
        !this.flag && this.forInstitute()
          ? `(${this.translateService.instant('ORDER.CARD.ADDRESS_NOTE_SCHOOL')}
          ${home.infoNote ? ' ' + home.infoNote : ''})`
          : home.infoNote
            ? `(${home.infoNote})`
            : '';
      const noAddressNote = home.noAddressNote
        ? this.forInstitute() && !this.flag
          ? this.translateService.instant('ORDER.CARD.NO_ADDRESS_NOTE_SCHOOL')
          : this.translateService.instant(home.noAddressNote)
        : '';
      addresses =
        addresses +
        home.postAddress +
        ' ' +
        '\n' +
        (infoNote ? infoNote + '\n' : '') +
        (noAddressNote ? noAddressNote + '\n' : '');

      for (let recipient of home.homeRecipients) {
        addresses =
          addresses +
          (this.showIndexes ? recipient.index + '. ' : '') +
          recipient.fullNameSnapshot +
          ' ' +
          this.fullDayBirthday(recipient) +
          ' ' +
          (recipient.infoNote ? recipient.infoNote : '') +
          ' ' +
          (recipient.photoLink ? recipient.photoLink + ' ' : '') +
          (recipient.specialComment ? recipient.specialComment : '') +
          '\n';
      }
      addresses = addresses + '\n';
    }
    return addresses;
  }
}
