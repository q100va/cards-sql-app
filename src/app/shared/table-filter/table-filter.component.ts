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
import {
  DateAdapter,
  MAT_DATE_LOCALE,
  MatOptionSelectionChange,
} from '@angular/material/core';
import {
  MatDatepickerIntl,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import 'moment/locale/ru';
import { Event } from '@angular/router';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { RoleService } from '../../services/role.service';
import { AddressFilterComponent } from '../address-filter/address-filter.component';
import { AddressFilterParams } from '../../interfaces/address-filter-params';
import { DefaultAddressParams } from '../../interfaces/default-address-params';

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
  private addressService = inject(AddressService);
  private roleService = inject(RoleService);
  private messageService = inject(MessageService);
  private injector = inject(Injector);
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
    class: "none",
  };

  goToFirstPage = output<void>();
  addressString = signal<string>('');
  addressFilter = signal<{
    countries: null | number[] | [];
    regions: null | number[] | [];
    districts: null | number[] | [];
    localities: null | number[] | [];
  }>({
    countries: null,
    regions: null,
    districts: null,
    localities: null,
  });
  addressFilterBadgeValue = signal<number>(0);

  filterBadgeValue = output<number>();
  filterValue = output<{
    [key: string]: string[] | Date[] | null | { [key: string]: string }[];
  }>();
  addressStringValue = output<string>();
  addressFilterValue = output<{
    [key: string]: number[] | null | [];
  }>();
  notActualOption = model.required<boolean>();
  strongAddressFilter = output<boolean>();
  strongContactFilter = output<boolean>();
  rolesList!: { id: number; name: string }[];

  defaultAddressParams = input.required<DefaultAddressParams>();

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
    roles: new FormControl(null),
    comment: new FormControl(null),
    contactTypes: new FormControl(null),
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
    console.log(
      'defaultAddressParams in table-filter',
      this.defaultAddressParams()
    );

    this.roleService.getRolesNamesList().subscribe({
      next: (res) => {
        // console.log('res');
        // console.log(res);
        this.rolesList = res.data.roles;
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
  }

  onAddressFilterChange(value: {
    countries: null | number[] | [];
    regions: null | number[] | [];
    districts: null | number[] | [];
    localities: null | number[] | [];
  }) {
    this.addressFilter.set(value);
    this.emitSelectedFilters();
  }
  onAddressStringChange(value: string) {
    this.addressString.set(value);
    this.emitSelectedFilters();
  }
  onAddressFilterBadgeValueChange(value: number) {
    this.addressFilterBadgeValue.set(value);
    this.emitSelectedFilters();
  }
  emitSelectedFilters() {
    let count = 0;
    let filter: { [key: string]: string[] | Date[] | null } = {};
    /*     let addressFilter: {
      [key: string]: { [key: string]: string | number }[] | null | [];
    } = {};
 */
    for (let filterItem of ['roles', 'comment', 'contactTypes']) {
      filter[filterItem] = this.form.controls[filterItem].value;
      if (
        this.form.controls[filterItem].value !== null &&
        this.form.controls[filterItem].value.length > 0
      ) {
        count = count + 1;
      }
    }

    //if only start or end
    if (
      this.form.controls['startBeginningDate'].value &&
      !this.form.controls['endBeginningDate'].value
    ) {
      filter['dateBeginningRange'] = [
        this.form.controls['startBeginningDate'].value.toDate(),
        new Date(),
      ];
      count = count + 1;
    }

    if (
      !this.form.controls['startBeginningDate'].value &&
      this.form.controls['endBeginningDate'].value
    ) {
      filter['dateBeginningRange'] = [
        new Date('2014-10-01'),
        this.form.controls['endBeginningDate'].value.toDate(),
      ];
      count = count + 1;
    }

    if (
      this.form.controls['startBeginningDate'].value &&
      this.form.controls['endBeginningDate'].value
    ) {
      //console.log('dateBeginningRange');
      //console.log(this.form.controls['startBeginningDate'].value);
      //console.log(this.form.controls['endBeginningDate'].value);
      count = count + 1;
      filter['dateBeginningRange'] = [
        this.form.controls['startBeginningDate'].value.toDate(),
        this.form.controls['endBeginningDate'].value.toDate(),
      ];
    }
    if (
      !this.form.controls['startBeginningDate'].value &&
      !this.form.controls['endBeginningDate'].value
    ) {
      filter['dateBeginningRange'] = null;
    }

    if (
      this.form.controls['startRestrictionDate'].value &&
      this.form.controls['endRestrictionDate'].value
    ) {
      //console.log('dateRestrictionRange');
      //console.log(this.form.controls['startRestrictionDate'].value);
      //console.log(this.form.controls['endRestrictionDate'].value);
      count = count + 1;
      filter['dateRestrictionRange'] = [
        this.form.controls['startRestrictionDate'].value.toDate(),
        this.form.controls['endRestrictionDate'].value.toDate(),
      ];
    }
    if (
      !this.form.controls['startRestrictionDate'].value &&
      !this.form.controls['endRestrictionDate'].value
    ) {
      filter['dateRestrictionRange'] = null;
    }

    /*     for (let filterItem of [
      'countries',
      'regions',
      'districts',
      'localities',
    ]) {
      addressFilter[filterItem] = this.form.controls[filterItem].value;
    }
    if (
      this.form.controls['countries'].value !== null &&
      this.form.controls['countries'].value.length > 0
    ) {
      count = count + 1;
    } */
    count = count + this.addressFilterBadgeValue();
    //console.log('filter');
    //console.log(filter);
    /*     console.log('addressFilter');
    console.log(addressFilter);
 */
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
    let filter: {
      [key: string]: string[] | Date[] | null | { [key: string]: string }[];
    } = {};
    let addressFilter: {
      [key: string]: number[] | null | [];
    } = {};
    this.form.reset();

    for (let filterItem of ['roles', 'comment', 'contactTypes', 'dateRange']) {
      filter[filterItem] = null;
    }
    this.addressFilterComponent.clearForm();

    for (let filterItem of ['country', 'region', 'district', 'locality']) {
      addressFilter[filterItem] = null;
    }

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
