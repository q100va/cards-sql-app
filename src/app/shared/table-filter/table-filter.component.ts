// src/app/shared/table-filter/table-filter.component.ts
import {
  Component,
  DestroyRef,
  Injector,
  ViewChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  OnInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FieldsetModule } from 'primeng/fieldset';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { TranslateModule } from '@ngx-translate/core';

import { RoleService } from '../../services/role.service';
import { MessageWrapperService } from '../../services/message.service';

import {
  AddressFilterParams,
  DefaultAddressParams,
  AddressFilter,
  typedKeys,
} from '../../interfaces/toponym';
import {
  FilterComponentSource,
  GeneralFilter,
} from '../../interfaces/base-list';

import { AddressFilterComponent } from '../address-filter/address-filter.component';
import { ContactType } from '../../interfaces/user';

type FilterForm = FormGroup<{
  roles: FormControl<
    {
      id: number;
      name: string;
    }[]
  >;
  comment: FormControl<string[]>;
  contactTypes: FormControl<{ type: ContactType; label: string }[]>;
  startBeginningDate: FormControl<any>;
  endBeginningDate: FormControl<any>;
  startRestrictionDate: FormControl<any>;
  endRestrictionDate: FormControl<any>;
  strongAddressFilter: FormControl<boolean>;
  strongContactFilter: FormControl<boolean>;
}>;

@Component({
  selector: 'app-table-filter',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
    BadgeModule,
    OverlayBadgeModule,
    FieldsetModule,
    AddressFilterComponent,
    TranslateModule,
  ],
  templateUrl: './table-filter.component.html',
  styleUrl: './table-filter.component.css',
})
export class TableFilterComponent implements OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly roleService = inject(RoleService);
  private readonly msgWrapper = inject(MessageWrapperService);

  @ViewChild(AddressFilterComponent)
  addressFilterComponent!: AddressFilterComponent;

  // Inputs / Outputs
  defaultAddressParams = input.required<DefaultAddressParams>();
  source = input.required<FilterComponentSource>();
  includeOutdatedOption = model.required<boolean>();

  filterBadgeValue = output<number>();
  filterValue = output<GeneralFilter>();
  addressStringValue = output<string>();
  addressFilterValue = output<AddressFilter>();
  strongAddressFilter = output<boolean>();
  strongContactFilter = output<boolean>();
  goToFirstPage = output<void>();

  // UI state
  addressString = signal<string>('');
  addressFilter = signal<AddressFilter>({
    countries: [],
    regions: [],
    districts: [],
    localities: [],
  });
  addressFilterBadgeValue = signal<number>(0);
  lessThanTwoContactTypes = signal<boolean>(true);
  lessThanTwoToponyms = signal<boolean>(true);

  // Data
  rolesList: { id: number; name: string }[] = [];
  params!: AddressFilterParams;

  // Reactive toggles
  private strongAddressFilterControl = effect(
    () => {
      const enable =
        this.includeOutdatedOption() && !this.lessThanTwoToponyms();
      const ctl = this.form.controls.strongAddressFilter;
      if (enable) ctl.enable();
      else {
        ctl.setValue(false, { emitEvent: false });
        ctl.disable();
      }
    },
    { injector: this.injector }
  );

  private strongContactsFilterControl = effect(
    () => {
      const enable = !this.lessThanTwoContactTypes();
      const ctl = this.form.controls.strongContactFilter;
      if (enable) ctl.enable();
      else {
        ctl.setValue(false, { emitEvent: false });
        ctl.disable();
      }
    },
    { injector: this.injector }
  );

  // Form
  form: FilterForm = new FormGroup({
    roles: new FormControl<
      {
        id: number;
        name: string;
      }[]
    >([], { nonNullable: true }),
    comment: new FormControl<string[]>([], { nonNullable: true }),
    contactTypes: new FormControl<{ type: ContactType; label: string }[]>([], {
      nonNullable: true,
    }),
    startBeginningDate: new FormControl<any>(null),
    endBeginningDate: new FormControl<any>(null),
    startRestrictionDate: new FormControl<any>(null),
    endRestrictionDate: new FormControl<any>(null),
    strongAddressFilter: new FormControl<boolean>(
      { value: false, disabled: true },
      { nonNullable: true }
    ),
    strongContactFilter: new FormControl<boolean>(
      { value: false, disabled: true },
      { nonNullable: true }
    ),
  });

  // Static data
  readonly contactTypesList = [
    { type: 'email', label: 'NAV.FILTER.EMAIL_OPT' },
    { type: 'phoneNumber', label: 'NAV.FILTER.PHONE_NUMBER_OPT' },
    { type: 'telegramId', label: 'NAV.FILTER.TELEGRAM_ID_OPT' },
    {
      type: 'telegramPhoneNumber',
      label: 'NAV.FILTER.TELEGRAM_PHONE_NUMBER_OPT',
    },
    { type: 'telegramNickname', label: 'NAV.FILTER.TELEGRAM_NICKNAME_OPT' },
    { type: 'whatsApp', label: 'NAV.FILTER.WHATSAPP_OPT' },
    { type: 'vKontakte', label: 'NAV.FILTER.VKONTAKTE_OPT' },
    { type: 'instagram', label: 'NAV.FILTER.INSTAGRAM_OPT' },
    { type: 'facebook', label: 'NAV.FILTER.FACEBOOK_OPT' },
    { type: 'otherContact', label: 'NAV.FILTER.OTHER_CONTACT_OPT' },
  ] as const;

  ngOnInit() {
    this.params = {
      source: this.source(),
      multiple: true,
      cols: '1',
      gutterSize: '16px',
      rowHeight: '57px',
      isShowCountry: true,
      isShowRegion: true,
      isShowDistrict: true,
      isShowLocality: true,
      class: 'none',
    };

    this.roleService
      .getRolesNamesList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => (this.rolesList = res.data),
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'TableFilterComponent',
            stage: 'ngOnInit - getRolesNamesList',
            typeOfList: this.source(),
          }),
      });
  }

  // Address filter child → parent
  onAddressFilterChange(v: AddressFilter) {
    this.addressFilter.set(v);
    this.emitSelectedFilters();
  }
  onAddressStringChange(v: string) {
    this.addressString.set(v);
    this.emitSelectedFilters();
  }
  onAddressFilterBadgeValueChange(v: number) {
    this.addressFilterBadgeValue.set(v);
    this.emitSelectedFilters();
  }

  // Build/emit current filter state
  private getRange(
    startKey: keyof FilterForm['controls'],
    endKey: keyof FilterForm['controls'],
    fallbackStart?: Date,
    fallbackEnd?: Date
  ): Date[] {
    const start = this.form.controls[startKey].value;
    const end = this.form.controls[endKey].value;
    const toDate = (d: any) =>
      typeof d?.toDate === 'function' ? d.toDate() : d;

    if (start && end) return [toDate(start), toDate(end)];
    if (start && !end) return [toDate(start), fallbackEnd ?? new Date()];
    if (!start && end)
      return [fallbackStart ?? new Date('2014-10-01'), toDate(end)];
    return [];
  }

  private recomputeEnablers(filter: GeneralFilter) {
    this.lessThanTwoContactTypes.set((filter.contactTypes ?? []).length < 2);

    this.lessThanTwoToponyms.set(true);
    for (const k of typedKeys(this.addressFilter())) {
      if (this.addressFilter()[k].length > 1) {
        this.lessThanTwoToponyms.set(false);
        break;
      }
    }

    if (this.lessThanTwoContactTypes()) {
      this.form.controls.strongContactFilter.setValue(false, {
        emitEvent: false,
      });
    }
    if (this.lessThanTwoToponyms()) {
      this.form.controls.strongAddressFilter.setValue(false, {
        emitEvent: false,
      });
    }
  }

  emitSelectedFilters() {
    let count = 0;

    const filter: GeneralFilter = {
      roles: this.form.controls.roles.value ?? [],
      comment: this.form.controls.comment.value ?? [],
      contactTypes: this.form.controls.contactTypes.value ?? [],
      dateBeginningRange: this.getRange(
        'startBeginningDate',
        'endBeginningDate',
        new Date('2014-10-01'),
        new Date()
      ),
      dateRestrictionRange: this.getRange(
        'startRestrictionDate',
        'endRestrictionDate'
      ),
    };

    // Count active filters
    if (filter.dateBeginningRange.length) count++;
    if (filter.dateRestrictionRange.length) count++;
    if ((filter.roles ?? []).length) count++;
    if (filter.comment.length) count++;
    if (filter.contactTypes.length) count++;

    this.recomputeEnablers(filter);
    count += this.addressFilterBadgeValue();

    // Emit everything atomically
    this.goToFirstPage.emit();
    this.filterBadgeValue.emit(count);
    this.filterValue.emit(filter);
    this.addressStringValue.emit(this.addressString());
    this.addressFilterValue.emit(this.addressFilter());
    this.strongAddressFilter.emit(this.form.controls.strongAddressFilter.value);
    this.strongContactFilter.emit(this.form.controls.strongContactFilter.value);
  }

  clearForm() {
    this.form.reset({
      roles: [],
      comment: [],
      contactTypes: [],
      startBeginningDate: null,
      endBeginningDate: null,
      startRestrictionDate: null,
      endRestrictionDate: null,
      strongAddressFilter: false,
      strongContactFilter: false,
    } as any);

    this.form.controls.strongAddressFilter.disable();
    this.form.controls.strongContactFilter.disable();

    this.lessThanTwoContactTypes.set(true);
    this.lessThanTwoToponyms.set(true);

    this.addressFilterComponent.clearForm();

    // Emit cleared state
    this.filterBadgeValue.emit(0);
    this.filterValue.emit({
      roles: [],
      comment: [],
      contactTypes: [],
      dateBeginningRange: [],
      dateRestrictionRange: [],
    });
    this.addressStringValue.emit('');
    this.addressFilterValue.emit({
      countries: [],
      regions: [],
      districts: [],
      localities: [],
    });
    this.strongAddressFilter.emit(this.form.controls.strongAddressFilter.value);
    this.strongContactFilter.emit(this.form.controls.strongContactFilter.value);
  }
}
