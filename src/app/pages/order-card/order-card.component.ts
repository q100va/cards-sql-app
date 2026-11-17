import { Component, DestroyRef, inject, ViewChild } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import {
  AutoComplete,
  AutoCompleteCompleteEvent,
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
import {
  ADDRESS_CATEGORY,
  ORDER_SOURCE_OPTIONS,
  ORDER_STATUS,
} from '../../../../shared/constants/orders';
import { INSTITUTE_CATEGORIES, InstituteCategoryId } from '../../../../shared/constants/volunteers';
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
  readonly instituteCategories: Record<
  number,
  (typeof INSTITUTE_CATEGORIES)[InstituteCategoryId]
> = INSTITUTE_CATEGORIES;
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
  readonly sources = ORDER_SOURCE_OPTIONS;
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
      this.authService.has('FULL_FILTER_NEW_ORDER')
        ? ADDRESS_CATEGORY.ANY
        : ADDRESS_CATEGORY.FOR_SCHOOLS,
      {
        nonNullable: true,
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
  actualOccasions: Occasion[] = [];
  index = 0;
  filteredContacts: ContactOption[] = [];
  showSpinner = false;
  blockCreateButton = false;
  contactReminder = '';
  // Only the newest intent in each lookup may commit results or report errors.
  private volunteerLookupIntent = 0;
  private contactLookupIntent = 0;
  private createAttempt = 0;
  private preflightAttempt = -1;
  private createRequestPending = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.volunteerLookupIntent++;
      this.contactLookupIntent++;
      this.createAttempt++;
    });
  }

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
          this.volunteerLookupIntent++;
          this.volunteer = null;
        }
        this.message = '';
        this.contactReminder = '';
        this.list = [];
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
        this.title = 'OCCASION.FEBRUARY_23.NAME';
        break;

      case '4':
        this.title = 'OCCASION.MARCH_8.NAME';
        break;

      case '5':
        this.title = 'OCCASION.MAY_9.NAME';
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
  }
  goForward(event: any) {
    event.preventDefault();
    this.index =
      this.index + 1 < this.actualOccasions.length ? this.index + 1 : 0;
    this.month = this.actualOccasions[this.index].month;
  }

  onCreateOrderClick() {
    if (this.blockCreateButton) return;
    const attempt = ++this.createAttempt;
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
            if (attempt === this.createAttempt) this.checkDuplicates(attempt);
          }, 200);
        },
        reject: () => {
          this.finishCreateAttempt(attempt);
        },
      });
    } else {
      this.checkDuplicates(attempt);
    }
  }

  private finishCreateAttempt(attempt: number) {
    if (attempt !== this.createAttempt) return;
    this.createAttempt++;
    this.createRequestPending = false;
    this.showSpinner = false;
    this.blockCreateButton = false;
  }

  checkDuplicates(attempt = this.createAttempt) {
    if (attempt !== this.createAttempt || attempt === this.preflightAttempt) return;
    this.preflightAttempt = attempt;
    this.orderService
      .checkOrder(this.volunteer!.id, this.actualOccasions[this.index].id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (attempt !== this.createAttempt) return;
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
                this.createOrder(attempt);
              },
              reject: () => {
                this.finishCreateAttempt(attempt);
              },
            });
          } else {
            this.createOrder(attempt);
          }
        },
        error: (err) => {
          if (attempt !== this.createAttempt) return;
          this.finishCreateAttempt(attempt);
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
  createOrder(attempt = this.createAttempt) {
    if (attempt !== this.createAttempt || this.createRequestPending) return;
    this.showSpinner = true;
    this.message = '';
    this.contactReminder = '';
    this.list = [];
    this.occasionName = this.getOccasionName(this.actualOccasions[this.index]);
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      this.finishCreateAttempt(attempt);
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
      this.finishCreateAttempt(attempt);
      return;
    }
    const params = orderDraftSchema.parse({
      userId,
      volunteerId: this.volunteer!.id,
      occasionId: this.actualOccasions[this.index].id,

      status: this.orderForm.controls.noConfirmationRequired.value
        ? ORDER_STATUS.ACCEPTED
        : ORDER_STATUS.PENDING,

      source,

      forSchoolDepartment: !this.authService.has('FULL_FILTER_NEW_ORDER'),
      contactId: contact.id,
      amount,
      comment: this.orderForm.controls.comment.value,
      instituteId: this.orderForm.controls.instituteId.value,
    });

    const filtersDraft = orderFilterSchema.parse({
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

      minFromOneHouse: this.filterForm.controls.minFromOneHouse.value,

      maxFromOneHouse: this.filterForm.controls.maxFromOneHouse.value,

      maxNoAddress: this.filterForm.controls.maxNoAddress.value,
    });

    this.createRequestPending = true;
    this.orderService
      .createOrder(params, filtersDraft)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.finishCreateAttempt(attempt);
        }),
      )
      .subscribe({
        next: (res) => {
          if (attempt !== this.createAttempt) return;
          if (res.data.recipients.length === 0) {
            this.message = 'ORDER.CARD.FAILED_MESSAGE';
          } else {
            this.list = res.data.recipients;
          }
          this.contactReminder = ` ${this.translateService.instant('ORDER.CARD.FOR_NOTE')} ${res.data.contact}`;
        },
        error: (err) => {
          if (attempt !== this.createAttempt) return;
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
    const query = event.query?.trim();
    const intent = ++this.contactLookupIntent;

    if (!query || query.length < 3) {
      this.filteredContacts = [];
      return;
    }

    this.volunteerService
      .searchContacts(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (intent !== this.contactLookupIntent) return;
          this.filteredContacts = res.data;
        },
        error: (err) => {
          if (intent !== this.contactLookupIntent) return;
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
    const intent = ++this.volunteerLookupIntent;
    this.message = '';
    this.contactReminder = '';
    this.list = [];
    this.volunteerService
      .getById(volunteerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (intent !== this.volunteerLookupIntent) return;
          this.volunteer = res.data;
          if (updateContact) {
            const firstKey = Object.keys(this.volunteer.orderedContacts)[0] as
              | ContactOption['type']
              | undefined;

            const firstContacts = Object.values(
              this.volunteer.orderedContacts,
            )[0];

            const firstContact = firstContacts?.[0];

            if (firstKey && firstContact) {
              this.orderForm.controls.contact.setValue({
                id: firstContact.id,
                volunteerId: this.volunteer.id,
                type: firstKey,
                content: firstContact.content,
              });
            }
          }
        },
        error: (err) => {
          if (intent !== this.volunteerLookupIntent) return;
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

    this.dialog.open(DetailsDialogComponent, { ...this.dialogConfig, data: dialogData });
  }

  private isRefreshResult(result: unknown): result is { refresh: true } {
    return typeof result === 'object' && result !== null &&
      'refresh' in result && result.refresh === true;
  }

  onOpenCardClick() {
    if (!this.volunteer) return;
    const volunteerId = this.volunteer.id;
    const intent = this.volunteerLookupIntent;
    this.volunteerService
      .getById(volunteerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (intent !== this.volunteerLookupIntent || this.volunteer?.id !== volunteerId) return;
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
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (result: unknown) => {
                if (intent !== this.volunteerLookupIntent || this.volunteer?.id !== volunteerId ||
                  !this.isRefreshResult(result)) return;
                this.getVolunteer(volunteerId, true);
              },
            });
        },
        error: (err) => {
          if (intent !== this.volunteerLookupIntent || this.volunteer?.id !== volunteerId) return;
          this.msgWrapper.handle(err, {
            source: 'OrderCardComponent',
            stage: 'openVolunteerCard',
            volunteerId,
          });
        },
      });
  }
}
