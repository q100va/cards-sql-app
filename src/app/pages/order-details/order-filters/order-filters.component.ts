import { Component, DestroyRef, inject, input } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { zodValidator } from '../../../utils/zod-validator';
import { orderFilterSchema } from '../../../../../shared/schemas/order.schema';
import { getRegionsWithNearby } from '../../../../../shared/constants/nearby-regions';
import { OrderService } from '../../../services/order.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageWrapperService } from '../../../services/message.service';
import {
  dateYearRangeValidator,
  genderAmountSumValidator,
  houseAmountValidator,
} from '../../../utils/custom.validator';

@Component({
  selector: 'app-order-filters',
  imports: [
    AccordionModule,
    MatGridListModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    MatTooltipModule,
  ],
  templateUrl: './order-filters.component.html',
  styleUrl: './order-filters.component.css',
})
export class OrderFiltersComponent {
  private readonly orderService = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly msgWrapper = inject(MessageWrapperService);
  readonly translateService = inject(TranslateService);

  ADDRESS_FILTER = [
    { id: 1, optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ANY' },
    { id: 2, optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.FOR_SCHOOLS' },
    {
      id: 3,
      optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ONLY_WITH_ADDRESS',
    },
    { id: 4, optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.NO_RELEASED' },
    {
      id: 5,
      optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ONLY_MENT_CATEGORY',
    },
  ] as const;

  GENDER_FILTER = [
    { id: 1, optionKey: 'ORDER.CARD.FILTERS.GENDER.ANY' },
    { id: 2, optionKey: 'ORDER.CARD.FILTERS.GENDER.MALE' },
    { id: 3, optionKey: 'ORDER.CARD.FILTERS.GENDER.FEMALE' },
    { id: 4, optionKey: 'ORDER.CARD.FILTERS.GENDER.PROPORTION' },
  ] as const;

  actualYear = new Date().getFullYear();
  regions: {
    id: number;
    name: string;
    // neighbors: number[];
  }[] = [];
  homes: {
    id: number;
    name: string;
    regionId: number;
  }[] = [];
  filteredHomes: {
    id: number;
    name: string;
    regionId: number;
  }[] = [];

  private readonly defaultFilter = {
    addressCategory: 1,
    gender: 1,
    maleAmount: null,
    femaleAmount: null,
    onlyWithPicture: false,
    onlyAnniversaries: false,
    onlyAnniversariesAndOldest: false,
    onlyWithConcents: false,
    year1: null,
    year2: null,
    date1: null,
    date2: null,
    regions: [],
    homes: [],
    addSpareRegions: false,
    minFromOneHouse: null,
    maxFromOneHouse: null,
    maxNoAddress: null,
  };

  filterForm = input.required<FormGroup>();
  amountControl = input.required<FormControl<number | null>>();

  ngOnInit() {
    this.filterForm().addValidators([
      genderAmountSumValidator(this.amountControl()),
      houseAmountValidator(this.amountControl()),
      dateYearRangeValidator(),
    ]);

    this.amountControl()
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.filterForm().updateValueAndValidity();
      });

    this.filterForm()
      .controls['gender'].valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.filterForm().updateValueAndValidity();
      });

    this.orderService
      .getOrderFiltersData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.regions = res.data.regions;
          this.homes = res.data.homes;
          this.filteredHomes = res.data.homes;
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OrderFiltersComponent',
            stage: 'getOrderFiltersData',
          }),
      });

    this.filterForm()
      .controls['regions'].valueChanges.pipe(
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((regionIds) => {
        if ((regionIds ?? []).length !== 1) {
          this.filterForm().controls['addSpareRegions'].disable();
          this.filterForm().controls['addSpareRegions'].setValue(false);
        } else {
          this.filterForm().controls['addSpareRegions'].enable();
          this.filterForm().controls['homes'].enable();
        }
        if (this.filterForm().controls['addSpareRegions'].value)
          regionIds = getRegionsWithNearby(regionIds);
        this.updateHomesByRegions(regionIds);
      });

    this.filterForm()
      .controls['addSpareRegions'].valueChanges.pipe(
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((addSpareRegions) => {
        let regionIds = this.filterForm().controls['regions'].value ?? [];
        if (addSpareRegions) regionIds = getRegionsWithNearby(regionIds);
        this.updateHomesByRegions(regionIds);
      });
  }

  private updateHomesByRegions(regionIds: number[]) {
    if (!regionIds.length) {
      this.filteredHomes = this.homes;
      return;
    }
    this.filteredHomes = this.homes.filter((home) =>
      regionIds.includes(home.regionId),
    );
    const allowedHomeIds = new Set(this.filteredHomes.map((home) => home.id));
    const selectedHomes = this.filterForm().controls['homes'].value ?? [];
    const validSelectedHomes = selectedHomes.filter((homeId: number) =>
      allowedHomeIds.has(homeId),
    );
    if (validSelectedHomes.length !== selectedHomes.length) {
      this.filterForm().controls['homes'].setValue(validSelectedHomes);
    }
  }

  get emptyFilter(): boolean {
    return (
      JSON.stringify(this.filterForm().getRawValue()) ===
      JSON.stringify(this.defaultFilter)
    );
  }

  clearFilter() {
    this.filterForm().reset(this.defaultFilter);
    this.filteredHomes = this.homes;
  }

  correctMaxNoAddress(value: number) {
    if (value == 3 || value == 5) {
      this.filterForm().controls['maxNoAddress'].disable();
      this.filterForm().controls['maxNoAddress'].setValue(null);
    } else {
      this.filterForm().controls['maxNoAddress'].enable();
    }
  }
  correctProportion(value: number) {
    if (value !== 4) {
      (this.filterForm().controls['femaleAmount'].setValue(null),
        this.filterForm().controls['maleAmount'].setValue(null));
    }
  }
  onSlideToggleChange(reason: string) {
    if (reason == 'onlyAnniversaries') {
      if (
        this.filterForm().controls['onlyAnniversariesAndOldest'].value &&
        this.filterForm().controls['onlyAnniversaries'].value
      ) {
        this.filterForm().controls['onlyAnniversariesAndOldest'].setValue(
          false,
        );
      }
    }
    if (reason == 'onlyAnniversariesAndOldest') {
      if (
        this.filterForm().controls['onlyAnniversariesAndOldest'].value &&
        this.filterForm().controls['onlyAnniversaries'].value
      ) {
        this.filterForm().controls['onlyAnniversaries'].setValue(false);
      }
    }
  }
}
