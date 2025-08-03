import {
  Component,
  Injector,
  ViewChild,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { FieldsetModule } from 'primeng/fieldset';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AddressService } from '../../services/address.service';
import { MessageService } from 'primeng/api';

import { OnInit, computed, signal } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import 'moment/locale/ru';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { RoleService } from '../../services/role.service';
import { AddressFilterComponent } from '../address-filter/address-filter.component';
import { AddressFilterParams } from '../../interfaces/address-filter-params';
import { DefaultAddressParams } from '../../interfaces/default-address-params';
import { AddressFilter } from '../../interfaces/address-filter';
import { GeneralFilter } from '../../interfaces/filter';
import { typedKeys } from '../../interfaces/types';
import { ErrorService } from '../../services/error.service';

@Component({
  selector: 'app-table-filter',
  imports: [
    FieldsetModule,
    BadgeModule,
    OverlayBadgeModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatDatepickerModule,
    MatCheckboxModule,
    AddressFilterComponent,
  ],
  templateUrl: './table-filter.component.html',
  styleUrl: './table-filter.component.css',
})
export class TableFilterComponent implements OnInit {
  private roleService = inject(RoleService);
  private messageService = inject(MessageService);
  private injector = inject(Injector);
  errorService = inject(ErrorService);

  @ViewChild(AddressFilterComponent)
  addressFilterComponent!: AddressFilterComponent;

  params: AddressFilterParams = {
    source: 'userList',
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

  goToFirstPage = output<void>();
  addressString = signal<string>('');
  addressFilter = signal<AddressFilter>({
    countries: [],
    regions: [],
    districts: [],
    localities: [],
  });
  addressFilterBadgeValue = signal<number>(0);

  filterBadgeValue = output<number>();
  filterValue = output<GeneralFilter>();
  addressStringValue = output<string>();
  addressFilterValue = output<AddressFilter>();
  notActualOption = model.required<boolean>();
  strongAddressFilter = output<boolean>();
  strongContactFilter = output<boolean>();
  rolesList!: { id: number; name: string }[];

  defaultAddressParams = input.required<DefaultAddressParams>();

  //TODO: make strongAddressFilter and strongContactFilter disable if nothing selected (?? or selected only one)

  private strongAddressFilterControl = effect(
    () => {
      if (this.notActualOption()) {
        this.form.get('strongAddressFilter')?.enable();
      } else {
        this.form.get('strongAddressFilter')?.setValue(false);
        this.form.get('strongAddressFilter')?.disable();
      }
    },
    { injector: this.injector }
  );

  form = new FormGroup<Record<string, AbstractControl | FormGroup>>({
    roles: new FormControl([]),
    comment: new FormControl([]),
    contactTypes: new FormControl([]),
    startBeginningDate: new FormControl(null),
    endBeginningDate: new FormControl(null),
    startRestrictionDate: new FormControl(null),
    endRestrictionDate: new FormControl(null),
    strongAddressFilter: new FormControl({ value: false, disabled: true }),
    strongContactFilter: new FormControl(false),
  });

  contactTypesList = [
    {
      type: 'email',
      label: 'Email',
    },
    {
      type: 'phoneNumber',
      label: 'Номер телефона',
    },
    {
      type: 'telegramId',
      label: 'Телеграм ID',
    },
    {
      type: 'telegramPhoneNumber',
      label: 'Телеграм номер телефона',
    },
    {
      type: 'telegramNickname',
      label: 'Телеграм nickname',
    },
    {
      type: 'whatsApp',
      label: 'WhatsApp',
    },
    {
      type: 'vKontakte',
      label: 'Вконтакте',
    },
    {
      type: 'instagram',
      label: 'Instagram',
    },
    {
      type: 'facebook',
      label: 'Facebook',
    },
    {
      type: 'otherContact',
      label: 'Другой контакт',
    },
  ];

  ngOnInit() {
    /*     console.log(
      'defaultAddressParams in table-filter',
      this.defaultAddressParams()
    ); */

    this.roleService.getRolesNamesList().subscribe({
      next: (res) => {
        // //console.log('res');
        // //console.log(res);
        this.rolesList = res.data.roles;
      },
      error: (err) => this.errorService.handle(err),
    });
  }

  onAddressFilterChange(value: AddressFilter) {
    this.addressFilter.set(value);
    this.emitSelectedFilters();
  }
  onAddressStringChange(value: string) {
    this.addressString.set(value);
    this.emitSelectedFilters();
  }
  onAddressFilterBadgeValueChange(value: number) {
    //console.log('onAddressFilterBadgeValueChange', value);
    this.addressFilterBadgeValue.set(value);
    this.emitSelectedFilters();
  }
  emitSelectedFilters() {
    let count = 0;

    const getRange = (
      startKey: string,
      endKey: string,
      fallbackStart?: Date,
      fallbackEnd?: Date
    ): Date[] => {
      const start = this.form.controls[startKey].value;
      const end = this.form.controls[endKey].value;

      if (start && end) return [start.toDate(), end.toDate()];
      if (start && !end) return [start.toDate(), fallbackEnd ?? new Date()];
      if (!start && end)
        return [fallbackStart ?? new Date('2014-10-01'), end.toDate()];
      return [];
    };

    let filter: GeneralFilter = {
      roles: [],
      comment: [],
      contactTypes: [],
      dateBeginningRange: getRange(
        'startBeginningDate',
        'endBeginningDate',
        new Date('2014-10-01'),
        new Date()
      ),
      dateRestrictionRange: getRange(
        'startRestrictionDate',
        'endRestrictionDate'
      ),
    };

    for (const key of typedKeys(filter)) {
      if (key === 'dateBeginningRange' || key === 'dateRestrictionRange') {
        //console.log('dateRange', filter[key]);
        if (filter[key].length > 0) count++;
        //console.log('dateRangeCount', count);
        continue;
      }

      const value = this.form.controls[key].value;
      filter[key] = value;
      if (value.length > 0) count++;
      //console.log('filterCount', count);
    }

    count += this.addressFilterBadgeValue();

    // Emit all results
    this.goToFirstPage.emit();
    this.filterBadgeValue.emit(count);
    this.filterValue.emit(filter);
    this.addressStringValue.emit(this.addressString());
    this.addressFilterValue.emit(this.addressFilter());
    this.strongAddressFilter.emit(
      this.form.controls['strongAddressFilter'].value
    );
    this.strongContactFilter.emit(
      this.form.controls['strongContactFilter'].value
    );
  }

  clearForm() {
    let filter: GeneralFilter = {
      roles: [],
      comment: [],
      contactTypes: [],
      dateBeginningRange: [],
      dateRestrictionRange: [],
    };
    let addressFilter: AddressFilter = {
      countries: [],
      regions: [],
      districts: [],
      localities: [],
    };
    this.form.reset({
      roles: [],
      comment: [],
      contactTypes: [],
      startBeginningDate: null,
      endBeginningDate: null,
      startRestrictionDate: null,
      endRestrictionDate: null,
      strongAddressFilter: false, //disabled: true }),
      strongContactFilter: false,
    });
    this.form.get('strongAddressFilter')?.disable();

    this.addressFilterComponent.clearForm();

    /*   for (let filterItem of ['country', 'region', 'district', 'locality']) {
      addressFilter[filterItem] = null;
    } */

    this.filterBadgeValue.emit(0);
    this.filterValue.emit(filter);
    this.addressStringValue.emit('');
    this.addressFilterValue.emit(addressFilter);
    this.strongAddressFilter.emit(
      this.form.controls['strongAddressFilter'].value
    );
    this.strongContactFilter.emit(
      this.form.controls['strongContactFilter'].value
    );
  }
}
