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

import { FloatLabel } from 'primeng/floatlabel';
import { ListboxModule } from 'primeng/listbox';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DateUtilsService } from '../../../services/date-utils.service';
import { SOURCES } from '../../../../../shared/constants/orders';
import { OrderFiltersComponent } from '../order-filters/order-filters.component';
import { Volunteer } from '../../../interfaces/advanced-model';
import { OccasionService } from '../../../services/occasion.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageWrapperService } from '../../../services/message.service';
import { Occasion } from '../../../../../shared/schemas/occasion.schema';
import {
  orderDraftSchema,
  orderFilterSchema,
} from '../../../../../shared/schemas/order.schema';
import { VolunteerService } from '../../../services/volunteer.service';
import { ContactOption } from '../../../../../shared/schemas/volunteer.schema';
import { zodValidator } from '../../../utils/zod-validator';
import { volunteerDialogConfig } from '../../volunteers-list/volunteer-dialog-config';
import { causeOfRestrictionControlSchema } from '../../../../../shared/schemas/user.schema';
import { DialogData } from '../../../interfaces/dialog-props';
import { MatDialog } from '@angular/material/dialog';
import { DetailsDialogComponent } from '../../../shared/dialogs/details-dialogs/details-dialog/details-dialog.component';

@Component({
  selector: 'app-order-details',
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
    AutoComplete,
    FloatLabel,
    ListboxModule,
  ],
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.css',
})
export class OrderDetailsComponent {
  readonly route = inject(ActivatedRoute);
  readonly dateUtils = inject(DateUtilsService);
  private readonly occasionService = inject(OccasionService);
  private readonly volunteerService = inject(VolunteerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly msgWrapper = inject(MessageWrapperService);
  readonly SOURCES = SOURCES;
  readonly dialog = inject(MatDialog);

  @ViewChild(OrderFiltersComponent)
  orderFiltersComponent!: OrderFiltersComponent;

  dialogConfig = {
    disableClose: true,
    minWidth: '800px',
    height: '80%',
    autoFocus: 'dialog',
    restoreFocus: true,
  } as const;

  volunteer: Volunteer | null = null;
  //TODO: добавление нового волонтера и открытие карточки существующего
  orderForm = new FormGroup({
    noConfirmationRequired: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    source: new FormControl<string | null>(null, [Validators.required]),
    contact: new FormControl<ContactOption | null>(null, [Validators.required]),
    amount: new FormControl<number | null>(null, {
      nonNullable: true,
      validators: [zodValidator(orderDraftSchema.shape.amount)],
    }),
    comment: new FormControl<string | null>(null, {
      validators: [zodValidator(orderDraftSchema.shape.comment)],
    }),
    instituteId: new FormControl<number | null>(null),
    //institutes: new FormArray<FormControl<boolean>>([]),
  });

  filterForm = new FormGroup({
    addressCategory: new FormControl<number>(1, {
      nonNullable: true,
      //validators: [zodValidator(occasionDraftSchema.shape.year)],
    }),
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
    onlyWithPicture: new FormControl<boolean>(false),
    onlyAnniversaries: new FormControl<boolean>(false),
    onlyAnniversariesAndOldest: new FormControl<boolean>(false),
    onlyWithConcents: new FormControl<boolean>(false),
    year1: new FormControl<number | null>(null, {
      validators: [zodValidator(orderFilterSchema.shape.year1)],
    }),
    year2: new FormControl<number | null>(null, {
      validators: [zodValidator(orderFilterSchema.shape.year2)],
    }),
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

  orderTypeId!: string;
  title!: string;
  month!: string | null;
  orderDate = new Date();
  actualOccasions: Occasion[] = [];
  index = 0;

  filteredContacts: ContactOption[] = [];

  dialogProps = volunteerDialogConfig;

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
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OrderDetailsComponent',
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
      });
  }

  initOrderByType(type: string) {
    switch (type) {
      case '1':
        this.title = 'Дни рождения';
        break;

      case '2':
        this.title = 'Новый год';
        break;

      case '4':
        this.title = '8 марта';
        break;

      default:
        this.title = '';
    }
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

  createOrder() {}

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
            source: 'OrderDetailsComponent',
            stage: 'getActualOccasions',
            type: this.orderTypeId,
          });
        },
      });
  }
  getVolunteer(volunteerId: number, updateContact = false) {
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
            this.orderForm.controls.contact
              .setValue({
                id: firstContact.id,
                volunteerId: this.volunteer.id,
                type: firstKey,
                content: firstContact.content,
              });
          }
          //this.addCheckboxes();
          //  console.log(this.filteredContacts);
        },
        error: (err) => {
          //this.filteredContacts = [];
          this.msgWrapper.handle(err, {
            source: 'OrderDetailsComponent',
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
            source: 'OrderDetailsComponent',
            stage: 'openVolunteerCard',
            volunteerId: this.volunteer?.id,
          }),
      });
  }
}
