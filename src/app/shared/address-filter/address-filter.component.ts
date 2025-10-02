import { Component, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSelectModule } from '@angular/material/select';
import { AddressService } from '../../services/address.service';
import { EMPTY, Observable, catchError, concatMap, of, tap } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { AddressFilterParams } from '../../interfaces/address-filter-params';
import {
  AddressKey,
  ToponymListMap,
  ToponymType,
  typedKeys,
  DefaultAddressParams
} from '../../interfaces/address-filter';
import { AddressFilter } from '../../interfaces/address-filter';
import { MessageWrapperService } from '../../services/message.service';
import { ToponymNamesList } from '../../../../shared/dist/toponym.schema';

@Component({
  selector: 'app-address-filter',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatGridListModule,
    MatSelectModule,
  ],

  templateUrl: './address-filter.component.html',
  styleUrl: './address-filter.component.css',
})
export class AddressFilterComponent {
  private cdr = inject(ChangeDetectorRef);
  private addressService = inject(AddressService);
  private readonly msgWrapper = inject(MessageWrapperService);

  params = input.required<AddressFilterParams>();
  defaultAddressParams = input.required<DefaultAddressParams>();

  toponymsList: ToponymListMap = {
    countriesList: [],
    regionsList: [],
    districtsList: [],
    localitiesList: [],
  };

  addressFilter = output<AddressFilter>();
  addressFilterBadgeValue = output<number>();
  addressString = output<string>();
  goToFirstPage = output<void>();

  /*  form = new FormGroup<Record<string, AbstractControl>>({
    country: new FormControl({ value: null, disabled: false }),
    region: new FormControl({ value: null, disabled: true }),
    district: new FormControl({ value: null, disabled: true }),
    locality: new FormControl({ value: null, disabled: true }),
  }); */

  form = new FormGroup<Record<string, AbstractControl>>({});

  emptyValue: null | [] = null;

  constructor() {}
  //TODO: spinner?
  ngOnInit() {
    //console.log('params in address-filter', this.params());

    this.emptyValue = this.params().multiple ? [] : null;

    this.form.addControl(
      'country',
      new FormControl({ value: this.emptyValue, disabled: false })
    );
    this.form.addControl(
      'region',
      new FormControl({ value: this.emptyValue, disabled: true })
    );
    this.form.addControl(
      'district',
      new FormControl({ value: this.emptyValue, disabled: true })
    );
    this.form.addControl(
      'locality',
      new FormControl({ value: this.emptyValue, disabled: true })
    );
    if (this.params().readonly) this.form.get('country')?.disable();

/*     //console.log(
      'defaultAddressParams in address-filter',
      this.defaultAddressParams()
    ); */
    this.addressService.getListOfToponyms([], 'countries').subscribe({
      next: (res) => {
        this.toponymsList.countriesList = res.data;

        if (this.defaultAddressParams().countryId) {
          this.setDefaultFormValue('country');
          this.onCountrySelectionChange()
            .pipe(
              concatMap(() => {
                if (this.defaultAddressParams().regionId) {
                  ////console.log('in process');
                  this.setDefaultFormValue('region');
                  return this.onRegionSelectionChange();
                }
                return EMPTY;
              }),
              concatMap(() => {
                if (this.defaultAddressParams().districtId) {
                  this.setDefaultFormValue('district');
                  return this.onDistrictSelectionChange();
                }
                return EMPTY;
              }),
              concatMap(() => {
                if (this.defaultAddressParams().localityId) {
                  this.setDefaultFormValue('locality');
                  return this.onLocalitySelectionChange();
                }
                return EMPTY;
              })
            )
            .subscribe({
              next: () => {
                ////console.log('All operations completed successfully');
              },
              error: (err) => this.msgWrapper.handle(err),
            });
        }
      },
      error: (err) => this.msgWrapper.handle(err),
    });
  }

  private selectionChangeMethods: {
    onCountrySelectionChange: () => Observable<any>;
    onRegionSelectionChange: () => Observable<any>;
    onDistrictSelectionChange: () => Observable<any>;
    onLocalitySelectionChange: () => Observable<any>;
  } = {
    onCountrySelectionChange: this.onCountrySelectionChange.bind(this),
    onRegionSelectionChange: this.onRegionSelectionChange.bind(this),
    onDistrictSelectionChange: this.onDistrictSelectionChange.bind(this),
    onLocalitySelectionChange: this.onLocalitySelectionChange.bind(this),
  };

  handleToponymSelectionChange(
    methodName: keyof AddressFilterComponent['selectionChangeMethods'],
    levelName: 'Country' | 'Region' | 'District' | 'Locality'
  ): void {
    this.selectionChangeMethods[methodName]().subscribe({
      next: () => {
        console.log(`${levelName} selection change completed`);
      },
      error: (err) => this.msgWrapper.handle(err),
    });
  }

  onCountrySelectionChange(): Observable<any> {
    ////console.log('Country selection changed' + this.form.get('country')?.value);
    return this.onToponymSelectionChange('country', 'region', 'regions').pipe(
      tap((res) => {
        //console.log('res', res);
        ////console.log('Country selection changed' + this.form.get('country')?.value);
        this.form.get('region')?.setValue(this.emptyValue);
        this.form.get('district')?.disable();
        this.form.get('district')?.setValue(this.emptyValue);
        this.toponymsList.districtsList = [];
        this.form.get('locality')?.disable();
        this.form.get('locality')?.setValue(this.emptyValue);
        this.toponymsList.localitiesList = [];
        if (this.params().readonly) this.form.get('country')?.disable();

        this.emitAddressData();
      }),
      catchError((err) => {
        this.msgWrapper.handle(err);
        return EMPTY;
      })
    );
  }
  onRegionSelectionChange(): Observable<any> {
    return this.onToponymSelectionChange(
      'region',
      'district',
      'districts'
    ).pipe(
      tap(() => {
        this.form.get('district')?.setValue(this.emptyValue);
        this.form.get('locality')?.disable();
        this.form.get('locality')?.setValue(this.emptyValue);
        this.toponymsList.localitiesList = [];
        if (this.params().readonly) this.form.get('region')?.disable();
        this.emitAddressData();
      }),
      catchError((err) => {
        this.msgWrapper.handle(err);
        return EMPTY;
      })
    );
  }
  onDistrictSelectionChange(): Observable<any> {
    return this.onToponymSelectionChange(
      'district',
      'locality',
      'localities'
    ).pipe(
      tap(() => {
        this.form.get('locality')?.setValue(this.emptyValue);
        if (this.params().readonly) this.form.get('district')?.disable();
        this.emitAddressData();
      }),
      catchError((err) => {
        this.msgWrapper.handle(err);
        return EMPTY;
      })
    );
  }
  onLocalitySelectionChange(): Observable<any> {
    if (this.params().readonly) this.form.get('locality')?.disable();
    this.emitAddressData();
    return EMPTY;
  }

  createAddressString(addressData: AddressFilter): string {
    const keyMap: Record<AddressKey, keyof ToponymListMap> = {
      countries: 'countriesList',
      regions: 'regionsList',
      districts: 'districtsList',
      localities: 'localitiesList',
    };

    let addressString = '';

    for (const key of typedKeys(addressData)) {
      const ids = addressData[key];
      //console.log('addressData, key, ids', addressData, key, ids);
      if (ids.length > 0) {
        const list: ToponymNamesList = this.toponymsList[keyMap[key]];

        for (const id of ids) {
          const name = list.find((item) => item.id === id)?.name;
          if (name) {
            addressString += name + ', ';
          }
        }
      }
    }

    return addressString.slice(0, -2);
  }

  /*   objectKeys(obj: any): string[] {
    return Object.keys(obj);
  } */

  emitAddressData() {
    let count = 0;
    let addressData: AddressFilter;

    const fields: AddressKey[] = [
      'countries',
      'regions',
      'districts',
      'localities',
    ];
    const controlMap: Record<AddressKey, ToponymType> = {
      countries: 'country',
      regions: 'region',
      districts: 'district',
      localities: 'locality',
    };

    addressData = Object.fromEntries(
      fields.map((field) => {
        const value = this.form.controls[controlMap[field]].value;
        const values = this.params().multiple ? value : value ? [value] : [];
        return [field, values];
      })
    ) as AddressFilter;

    if (
      //this.form.controls['country'].value &&
      // this.form.controls['country'].value.length > 0
      addressData.countries.length > 0
    ) {
      count = count + 1;
    }
    //console.log('this.emitAddressData', addressData);
    ////console.log('this.addressFilter', this.addressFilter);
    this.addressFilter.emit(addressData);
    if (
      this.params().source != 'toponymCard' &&
      this.params().source != 'userCard'
    ) {
      this.addressFilterBadgeValue.emit(count);
      this.addressString.emit(this.createAddressString(addressData));
      this.goToFirstPage.emit();
    }
  }

  onChangeMode(mode: string, data: DefaultAddressParams | null) {
    if (mode == 'edit') {
      if (this.params().source != 'userCard') {
        this.form.get('country')?.enable();
        this.form.get('region')?.enable();
        this.form.get('district')?.enable();
        this.form.get('locality')?.enable();
      } else {
        if (data) {
          //console.log('data in onChangeMode', data);
          // Sequentially execute the steps using concatMap
          this.form.controls['country'].setValue(data!.countryId);
          ////console.log('Country ID:', data?.countryId);
          this.selectionChangeMethods['onCountrySelectionChange']()
            .pipe(
              tap(() => {
                /*             this.form.controls['country'].setValue(data?.countryId);
                ////console.log('Country ID:', data?.countryId); */
              }),
              concatMap(() => {
                this.form.controls['region'].setValue(data!.regionId);
                ////console.log('Region ID:', data?.regionId);
                return this.selectionChangeMethods['onRegionSelectionChange']();
              }),
              concatMap(() => {
                this.form.controls['district'].setValue(data!.districtId);
                ////console.log('District ID:', data?.districtId);
                return this.selectionChangeMethods[
                  'onDistrictSelectionChange'
                ]();
              }),
              concatMap(() => {
                this.form.controls['locality'].setValue(data!.localityId);
                ////console.log('Locality ID:', data?.localityId);
                return this.selectionChangeMethods[
                  'onLocalitySelectionChange'
                ]();
              })
            )
            .subscribe({
              next: () => console.log('All selection changes completed'),
              error: (err) => this.msgWrapper.handle(err),
            });
        } else {
          this.form.get('country')?.enable();
          if (
            this.form.controls['country'].value &&
            this.toponymsList['regionsList'].length > 0
          )
            this.form.get('region')?.enable();
          if (
            this.form.controls['region'].value &&
            this.toponymsList['districtsList'].length > 0
          )
            this.form.get('district')?.enable();
          if (
            this.form.controls['district'].value &&
            this.toponymsList['localitiesList'].length > 0
          )
            this.form.get('locality')?.enable();
        }
      }
      this.params().class = 'none';
      this.params().readonly = false;
      this.emitAddressData();
    }
    if (mode == 'view') {
     // //console.log('onChangeMode');
      this.params().class = 'view-mode';
      this.params().readonly = true;
      if (data) {
       // //console.log('data in onChangeMode', data);
        // Sequentially execute the steps using concatMap
        this.form.controls['country'].setValue(data!.countryId);
        ////console.log('Country ID:', data?.countryId);
        this.selectionChangeMethods['onCountrySelectionChange']()
          .pipe(
            tap(() => {
              /*             this.form.controls['country'].setValue(data?.countryId);
              ////console.log('Country ID:', data?.countryId); */
            }),
            concatMap(() => {
              this.form.controls['region'].setValue(data!.regionId);
              ////console.log('Region ID:', data?.regionId);
              return this.selectionChangeMethods['onRegionSelectionChange']();
            }),
            concatMap(() => {
              this.form.controls['district'].setValue(data!.districtId);
              ////console.log('District ID:', data?.districtId);
              return this.selectionChangeMethods['onDistrictSelectionChange']();
            }),
            concatMap(() => {
              this.form.controls['locality'].setValue(data!.localityId);
              ////console.log('Locality ID:', data?.localityId);
              return this.selectionChangeMethods['onLocalitySelectionChange']();
            })
          )
          .subscribe({
            next: () => console.log('All selection changes completed'),
            error: (err) => this.msgWrapper.handle(err),
          });
      } else {
        this.form.get('country')?.disable();
        this.form.get('region')?.disable();
        this.form.get('district')?.disable();
        this.form.get('locality')?.disable();
      }
    }
  }

  clearForm() {
    this.form.reset({
      country: this.emptyValue,
      region: this.emptyValue,
      district: this.emptyValue,
      locality: this.emptyValue,
    });

    this.handleToponymSelectionChange('onCountrySelectionChange', 'Country');

    let addressData = {
      countries: [],
      regions: [],
      districts: [],
      localities: [],
    };

    this.addressFilterBadgeValue.emit(0);
    this.addressFilter.emit(addressData);
  }

  private setDefaultFormValue(key: ToponymType) {
    const toponymType:
      | 'countryId'
      | 'regionId'
      | 'districtId'
      | 'localityId' = `${key}Id`;

    const defaultAddressParams = this.defaultAddressParams()[toponymType]; /*
      ? this.defaultAddressParams()[toponymType]
      : this.defaultAddressParams()[toponymType] */
    const defaultValue = this.params().multiple
      ? [defaultAddressParams]
      : defaultAddressParams;
    this.form.controls[key]?.setValue(defaultValue);
    this.cdr.detectChanges();
  }

  private onToponymSelectionChange(
    key: ToponymType,
    nextKey: 'region' | 'district' | 'locality',
    typeOfList: 'regions' | 'districts' | 'localities'
  ): Observable<any> {
    //console.log(`key`, key);
    //console.log(`this.form.controls[key]`, this.form.controls[key]);
    if (
      (!this.params().multiple && this.form.controls[key].value) ||
      (this.params().multiple && this.form.controls[key].value.length > 0)
    ) {
      const idValues = !this.params().multiple
        ? [this.form.controls[key].value]
        : this.form.controls[key].value;

 /*      //console.log(
        'this.form.controls[key].value',
        this.form.controls[key].value
      ); */

      return this.addressService.getListOfToponyms(idValues, typeOfList).pipe(
        tap((res) => {
          this.toponymsList[`${typeOfList}List` as keyof ToponymListMap] =
            res.data;
          ////console.log(`Toponyms for ${typeOfList}:`, this.toponyms.regionsList);
          if (res.data?.length > 0 && !this.params().readonly) {
            this.form.get(nextKey)?.enable();
          } else {
            this.form.get(nextKey)?.disable();
          }
        }),
        catchError((err) => {
          this.msgWrapper.handle(err);
          return EMPTY;
        })
      );
    }
    this.toponymsList[`${typeOfList}List` as keyof ToponymListMap] = [];
    this.form.get(nextKey)?.disable();
    return of(null);
  }
}
