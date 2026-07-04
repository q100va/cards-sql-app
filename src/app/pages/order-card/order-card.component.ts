import { Component, DestroyRef, inject, ViewChild } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import {
  AutoComplete,
  AutoCompleteCompleteEvent,
  AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import { ProgressSpinner } from 'primeng/progressspinner';

import { FloatLabel } from 'primeng/floatlabel';
import { ListboxModule } from 'primeng/listbox';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DateUtilsService } from '../../services/date-utils.service';
import { SOURCES } from '../../../../shared/constants/orders';
import { OrderFiltersComponent } from './order-filters/order-filters.component';

import { OrderRecipientsComponent } from './order-recipients/order-recipients.component';
import { Volunteer } from '../../interfaces/advanced-model';
import { OccasionService } from '../../services/occasion.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageWrapperService } from '../../services/message.service';
import { Occasion } from '../../../../shared/schemas/occasion.schema';
import {
  orderDraftSchema,
  orderFilterSchema,
  OrderRecipients,
} from '../../../../shared/schemas/order.schema';
import { VolunteerService } from '../../services/volunteer.service';
import { ContactOption } from '../../../../shared/schemas/volunteer.schema';
import { zodValidator } from '../../utils/zod-validator';
import { volunteerDialogConfig } from '../volunteers-list/volunteer-dialog-config';
import { causeOfRestrictionControlSchema } from '../../../../shared/schemas/user.schema';
import { DialogData } from '../../interfaces/dialog-props';
import { MatDialog } from '@angular/material/dialog';
import { DetailsDialogComponent } from '../../shared/dialogs/details-dialogs/details-dialog/details-dialog.component';
import { AuthService } from '../../services/auth.service';
import { getRegionsWithNearby } from '../../../../shared/constants/nearby-regions';
import { OrderService } from '../../services/order.service';
import { ConfirmationService } from 'primeng/api';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-order-card',
  imports: [
    MatGridListModule,
    MatCardModule,
    TranslateModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatTooltipModule,
    OrderFiltersComponent,
    OrderRecipientsComponent,
    AutoComplete,
    FloatLabel,
    ListboxModule,
    ProgressSpinner,
  ],
  templateUrl: './order-card.component.html',
  styleUrl: './order-card.component.css',
})
export class OrderCardComponent {
  readonly route = inject(ActivatedRoute);
  readonly dateUtils = inject(DateUtilsService);
  private readonly occasionService = inject(OccasionService);
  private readonly volunteerService = inject(VolunteerService);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  readonly translateService = inject(TranslateService);
  readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly msgWrapper = inject(MessageWrapperService);
  readonly SOURCES = SOURCES;
  readonly dialog = inject(MatDialog);

  @ViewChild(OrderFiltersComponent)
  orderFiltersComponent!: OrderFiltersComponent;

  orderForm = new FormGroup({
    noConfirmationRequired: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    source: new FormControl<number | null>(null, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    contact: new FormControl<ContactOption | null>(null, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    amount: new FormControl<number | null>(null, {
      nonNullable: true,
      validators: [
        zodValidator(orderDraftSchema.shape.amount),
        Validators.required,
      ],
    }),
    comment: new FormControl<string | null>(null, {
      validators: [zodValidator(orderDraftSchema.shape.comment)],
    }),
    instituteId: new FormControl<number | null>(null),
    //institutes: new FormArray<FormControl<boolean>>([]),
  });

  filterForm = new FormGroup({
    addressCategory: new FormControl<number>(
      this.authService.has('FULL_FILTER_NEW_ORDER') ? 1 : 2,
      {
        nonNullable: true,
        //validators: [zodValidator(occasionDraftSchema.shape.year)],
      },
    ),
    gender: new FormControl<number>(1, {
      nonNullable: true,
      //validators: [zodValidator(occasionDraftSchema.shape.year)],
    }),
    maleAmount: new FormControl<number | null>(null, {
      validators: [zodValidator(orderFilterSchema.shape.maleAmount)],
    }),
    femaleAmount: new FormControl<number | null>(null, {
      validators: [zodValidator(orderFilterSchema.shape.femaleAmount)],
    }),
    onlyWithPicture: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    onlyAnniversaries: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    onlyAnniversariesAndOldest: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    onlyWithConcents: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    year1: new FormControl<number | null>(null, {
      validators: [zodValidator(orderFilterSchema.shape.year1)],
    }),
    year2: new FormControl<number | null>(null, {
      validators: [zodValidator(orderFilterSchema.shape.year2)],
    }),
    period: new FormControl<number | null>(null),
    date1: new FormControl<number | null>(null, {
      validators: [zodValidator(orderFilterSchema.shape.date1)],
    }),
    date2: new FormControl<number | null>(null, {
      validators: [zodValidator(orderFilterSchema.shape.date2)],
    }),
    regions: new FormControl<number[]>([], { nonNullable: true }),
    homes: new FormControl<number[]>([], { nonNullable: true }),
    addSpareRegions: new FormControl({
      value: false,
      disabled: true,
    }),
    minFromOneHouse: new FormControl<number | null>(null, {
      validators: [zodValidator(orderFilterSchema.shape.minFromOneHouse)],
    }),
    maxFromOneHouse: new FormControl<number | null>(null, {
      validators: [zodValidator(orderFilterSchema.shape.maxFromOneHouse)],
    }),
    maxNoAddress: new FormControl<number | null>(null, {
      validators: [zodValidator(orderFilterSchema.shape.maxNoAddress)],
    }),
  });

  dialogConfig = {
    disableClose: true,
    minWidth: '800px',
    height: '80%',
    autoFocus: 'dialog',
    restoreFocus: true,
  } as const;
  dialogProps = volunteerDialogConfig;
  volunteer: Volunteer | null = null;
  list: OrderRecipients = [];
  message = '';
  occasionName = '';
  orderTypeId!: string;
  title!: string;
  month!: string | null;
  orderDate = new Date();
  actualOccasions: Occasion[] = [];
  index = 0;
  filteredContacts: ContactOption[] = [];
  showSpinner = false;
  blockCreateButton = false;
  contactReminder = '';

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const typeId = params.get('typeId');

      if (!typeId) {
        return;
      }

      this.orderTypeId = typeId;
      this.initOrderByType(typeId);
    });

    this.occasionService
      .getActualOccasions(this.orderTypeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.actualOccasions = res.data;
          if (this.actualOccasions.length > 1) {
            this.index = Math.ceil((this.actualOccasions.length - 1) / 2);
            this.month = this.actualOccasions[this.index].month;
          }
          this.occasionName = this.getOccasionName(
            this.actualOccasions[this.index],
          );
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OrderCardComponent',
            stage: 'getActualOccasions',
            type: this.orderTypeId,
          }),
      });

    this.orderForm.controls.contact.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (!value) {
          this.volunteer = null;
        }
        this.message = '';
        this.contactReminder = '';
        this.list = [];
        console.log('value-contact', value);
      });
  }

  initOrderByType(type: string) {
    switch (type) {
      case '1':
        this.title = 'OCCASION.BIRTHDAY.NAME';
        break;

      case '2':
        this.title = 'OCCASION.NEW_YEAR.NAME';
        break;

      case '3':
        this.title = 'OCCASION.23_FEBRUARY.NAME';
        break;

      case '4':
        this.title = 'OCCASION.8_MARCH.NAME';
        break;

      case '5':
        this.title = 'OCCASION.9_MAY.NAME';
        break;

      case '6':
        this.title = 'OCCASION.EASTER.NAME';
        break;

      default:
        this.title = '';
    }
  }

  getOccasionName(occasion: Occasion) {
    return (
      this.translateService.instant(occasion!.type) +
      ' ' +
      (occasion!.monthNameKey
        ? this.translateService.instant(occasion!.monthNameKey)
        : '') +
      ' ' +
      occasion!.year
    );
  }

  goBack(event: any) {
    event.preventDefault();
    this.index =
      this.index - 1 < 0 ? this.actualOccasions.length - 1 : this.index - 1;
    this.month = this.actualOccasions[this.index].month;
    // this.occasionName = this.getOccasionName(this.actualOccasions[this.index]);
  }
  goForward(event: any) {
    event.preventDefault();
    this.index =
      this.index + 1 < this.actualOccasions.length ? this.index + 1 : 0;
    this.month = this.actualOccasions[this.index].month;
    // this.occasionName = this.getOccasionName(this.actualOccasions[this.index]);
  }

  onCreateOrderClick() {
    this.blockCreateButton = true;
    if (
      !this.orderForm.controls.instituteId.value &&
      (this.volunteer!.institutes.length ||
        this.orderForm.controls.amount.value! > 19)
    ) {
      this.confirmationService.confirm({
        header: this.translateService.instant('PRIME_CONFIRM.WARNING_HEADER'),
        message: this.translateService.instant(
          'PRIME_CONFIRM.ORDER_NOT_FOR_INSTITUTES',
        ),
        closable: true,
        closeOnEscape: true,
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: {
          label: this.translateService.instant('PRIME_CONFIRM.REJECT'),
        },
        acceptButtonProps: {
          label: this.translateService.instant('PRIME_CONFIRM.ACCEPT'),
          severity: 'secondary',
          outlined: true,
        },
        accept: () => {
          setTimeout(() => {
            this.checkDuplicates();
          }, 200);
        },
        reject: () => {
          this.blockCreateButton = false;
        },
      });
    } else {
      this.checkDuplicates();
    }
  }

  checkDuplicates() {
    this.orderService
      .checkOrder(this.volunteer!.id, this.actualOccasions[this.index].id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const duplicates = res.data;

          if (duplicates.length > 0) {
            const occasionName = this.getOccasionName(
              this.actualOccasions[this.index],
            );
            const info = duplicates
              .map(
                (d) =>
                  `- ${this.dateUtils.transformDate(d.date)} - ${d.userName} - ${d.amount}`,
              )
              .join('\n');
            this.confirmationService.confirm({
              header: this.translateService.instant(
                'PRIME_CONFIRM.WARNING_HEADER',
              ),
              message:
                this.translateService.instant(
                  'PRIME_CONFIRM.ORDER_DUPLICATES_1',
                  {
                    occasion: occasionName,
                  },
                ) +
                info +
                this.translateService.instant(
                  'PRIME_CONFIRM.ORDER_DUPLICATES_2',
                ),
              closable: true,
              closeOnEscape: true,
              icon: 'pi pi-exclamation-triangle',
              rejectButtonProps: {
                label: this.translateService.instant('PRIME_CONFIRM.REJECT'),
              },
              acceptButtonProps: {
                label: this.translateService.instant('PRIME_CONFIRM.ACCEPT'),
                severity: 'secondary',
                outlined: true,
              },
              accept: () => {
                this.createOrder();
              },
              reject: () => {
                this.blockCreateButton = false;
              },
            });
          } else {
            this.createOrder();
          }
        },
        error: (err) => {
          this.filteredContacts = [];
          this.msgWrapper.handle(err, {
            source: 'OrderCardComponent',
            stage: 'checkOrder',
            type: this.orderTypeId,
            occasionId: this.actualOccasions[this.index].id,
            volunteerId: this.volunteer!.id,
          });
        },
      });
  }
  createOrder() {
    this.showSpinner = true;
    this.message = '';
    this.contactReminder = '';
    this.list = [];
    this.occasionName = this.getOccasionName(this.actualOccasions[this.index]);
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }
    const source = this.orderForm.controls.source.value;
    const amount = this.orderForm.controls.amount.value;
    const contact = this.orderForm.controls.contact.value;
    const userId = this.authService.getCurrentUserSnapshot()?.id ?? null;

    if (
      source === null ||
      amount === null ||
      contact === null ||
      userId === null
    ) {
      return;
    }
    const params = {
      userId,
      volunteerId: this.volunteer!.id,
      occasionId: this.actualOccasions[this.index].id,
      //occasionType: +this.orderTypeId,
      status: this.orderForm.controls.noConfirmationRequired.value ? 2 : 1,
      source,
      contactId: contact.id,
      amount,
      comment: this.orderForm.controls.comment.value,
      instituteId: this.orderForm.controls.instituteId.value,
    };
    console.log('this.volunteer!.id', this.volunteer!.id);

    const filtersDraft = {
      addressCategory: this.filterForm.controls.addressCategory.value,
      gender: this.filterForm.controls.gender.value,
      maleAmount: this.filterForm.controls.maleAmount.value,
      femaleAmount: this.filterForm.controls.femaleAmount.value,
      onlyWithPicture: this.filterForm.controls.onlyWithPicture.value,
      onlyAnniversaries: this.filterForm.controls.onlyAnniversaries.value,
      onlyAnniversariesAndOldest:
        this.filterForm.controls.onlyAnniversariesAndOldest.value,
      onlyWithConcents: this.filterForm.controls.onlyWithConcents.value,
      year1: this.filterForm.controls.year1.value,
      year2: this.filterForm.controls.year2.value,
      date1: this.filterForm.controls.date1.value,
      date2: this.filterForm.controls.date2.value,
      regions:
        this.filterForm.controls.homes.value.length > 0
          ? []
          : this.filterForm.controls.addSpareRegions.value
            ? getRegionsWithNearby(this.filterForm.controls.regions.value)
            : this.filterForm.controls.regions.value,
      homes: this.filterForm.controls.homes.value,
      //addSpareRegions: this.filterForm.controls.addSpareRegions.value,
      minFromOneHouse: this.filterForm.controls.minFromOneHouse.value,
      maxFromOneHouse: this.filterForm.controls.maxFromOneHouse.value,
      maxNoAddress: this.filterForm.controls.maxNoAddress.value,
    };

    this.orderService
      .createOrder(params, filtersDraft)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.showSpinner = false;
          this.blockCreateButton = false;
        }),
      )
      .subscribe({
        next: (res) => {
          if (res.data.recipients.length === 0) {
            this.message = 'ORDER.CARD.FAILED_MESSAGE';
          } else {
            this.list = res.data.recipients;
          }
          this.contactReminder = ` ${this.translateService.instant('ORDER.CARD.FOR_NOTE')} ${res.data.contact}`;
        },
        error: (err) => {
          this.filteredContacts = [];
          this.msgWrapper.handle(err, {
            source: 'OrderCardComponent',
            stage: 'createOrder',
            type: this.orderTypeId,
            occasionId: this.actualOccasions[this.index].id,
          });
        },
      });
  }

  clear() {
    if (this.actualOccasions.length > 1) {
      this.index = Math.ceil((this.actualOccasions.length - 1) / 2);
      this.month = this.actualOccasions[this.index].month;
    }
    this.orderFiltersComponent.clearFilter();
    this.orderForm.controls.noConfirmationRequired.setValue(false);
    this.orderForm.controls.source.setValue(null);
    this.orderForm.controls.contact.setValue(null);
    this.orderForm.controls.amount.setValue(null);
    this.orderForm.controls.comment.setValue(null);
    this.message = '';
    this.list = [];
    this.occasionName = '';
    this.contactReminder = '';
  }

  fullName(volunteer: Volunteer): string {
    if (!volunteer) return '';
    return [volunteer.lastName, volunteer.firstName, volunteer.patronymic]
      .filter(Boolean)
      .join(' ');
  }
  getAddress(volunteer: Volunteer): string {
    return [
      volunteer.address.country?.name,
      volunteer.address.region?.shortName,
      volunteer.address.district?.shortName,
      volunteer.address.locality?.shortName,
    ]
      .filter(Boolean)
      .join(', ');
  }

  filterContact(event: AutoCompleteCompleteEvent) {
/*     this.message = '';
    this.contactReminder = '';
    this.list = []; */
    const query = event.query?.trim();

    if (!query || query.length < 2) {
      this.filteredContacts = [];
      return;
    }

    this.volunteerService
      .searchContacts(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.filteredContacts = res.data;
          console.log(this.filteredContacts);
        },
        error: (err) => {
          this.filteredContacts = [];
          this.msgWrapper.handle(err, {
            source: 'OrderCardComponent',
            stage: 'getActualOccasions',
            type: this.orderTypeId,
          });
        },
      });
  }
  getVolunteer(volunteerId: number, updateContact = false) {
    this.message = '';
    this.contactReminder = '';
    this.list = [];
    console.log('volunteerId', volunteerId);
    this.volunteerService
      .getById(volunteerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.volunteer = res.data;
          if (updateContact) {
            const firstKey = Object.keys(this.volunteer.orderedContacts)[0];
            const firstContact = Object.values(
              this.volunteer.orderedContacts,
            )[0][0];
            this.orderForm.controls.contact.setValue({
              id: firstContact.id,
              volunteerId: this.volunteer.id,
              type: firstKey,
              content: firstContact.content,
            });
          }
          //this.addCheckboxes();
          //  console.log(this.filteredContacts);
          console.log('this.volunteer', this.volunteer.id);
        },
        error: (err) => {
          //this.filteredContacts = [];
          this.msgWrapper.handle(err, {
            source: 'OrderCardComponent',
            stage: 'getActualOccasions',
            type: this.orderTypeId,
          });
        },
      });
  }

  onAddVolunteerClick() {
    this.dialogProps.object = null;
    this.dialogProps.addressFilterParams.readonly = false;
    this.dialogProps.addressFilterParams.class = 'none';

    const dialogData: DialogData<Volunteer> = {
      ...this.dialogProps,
      operation: 'create',
      controlsDisable: false,
      defaultAddressParams: {
        localityId: null,
        districtId: null,
        regionId: null,
        countryId: null,
      },
    };

    this.dialog
      .open(DetailsDialogComponent, { ...this.dialogConfig, data: dialogData })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.getVolunteer(res.id, true);
      });
  }

  onOpenCardClick() {
    this.volunteerService
      .getById(this.volunteer!.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const owner = res.data;
          const dialogProps = {
            ...this.dialogProps,
            addressFilterParams: {
              ...this.dialogProps.addressFilterParams,
              readonly: true,
              class: 'view-mode' as 'none' | 'view-mode' | undefined,
            },
            controls: [...(this.dialogProps.controls ?? [])],
            object: owner,
          };

          if (owner.isRestricted) {
            dialogProps.controls.push({
              controlName: 'causeOfRestriction',
              value: null,
              validators: [zodValidator(causeOfRestrictionControlSchema)],
              type: 'inputText',
              label: 'TABLE.DIALOGS.CAUSE_OF_BLOCK_LABEL',
              category: 'extraData',
              formType: 'formControl',
            });
          }

          const dialogData: DialogData<Volunteer> = {
            ...dialogProps,
            operation: 'view-edit',
            controlsDisable: true,
            defaultAddressParams: {
              localityId: owner?.address?.locality?.id ?? null,
              districtId: owner?.address?.district?.id ?? null,
              regionId: owner?.address?.region?.id ?? null,
              countryId: owner?.address?.country?.id ?? null,
            },
          };

          this.dialog
            .open(DetailsDialogComponent, {
              ...this.dialogConfig,
              data: dialogData,
            })
            .afterClosed()
            .pipe()
            .subscribe({
              next: () => {
                this.getVolunteer(this.volunteer!.id, true);
              },
            });
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OrderCardComponent',
            stage: 'openVolunteerCard',
            volunteerId: this.volunteer?.id,
          }),
      });
  }
}
