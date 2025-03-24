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
import { MessageService } from 'primeng/api';
import { EMPTY, Observable, catchError, concatMap, tap } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

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
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);
  private addressService = inject(AddressService);

  params = input.required<{
    multiple: boolean;
    // defaultValue: boolean;
    cols: string;
    gutterSize: string;
    rowHeight: string;
    type?: string;
  }>();
  defaultAddressParams = input.required<{
    localityId: number | null;
    districtId: number | null;
    regionId: number | null;
    countryId: number | null;
  }>();

  toponyms: {
    countriesList: { id: number; name: string }[] | [];
    regionsList: { id: number; name: string; countryId: number }[] | [];
    districtsList: { id: number; name: string; regionId: number }[] | [];
    localitiesList: { id: number; name: string; districtId: number }[] | [];
  } = {
    countriesList: [],
    regionsList: [],
    districtsList: [],
    localitiesList: [],
  };

  addressFilter = output<{
    countries: null | number[] | [];
    regions: null | number[] | [];
    districts: null | number[] | [];
    localities: null | number[] | [];
  }>();
  addressFilterBadgeValue = output<number>();
  addressString = output<string>();
  goToFirstPage = output<void>();

  form = new FormGroup<Record<string, AbstractControl>>({
    country: new FormControl({ value: null, disabled: false }),
    region: new FormControl({ value: null, disabled: true }),
    district: new FormControl({ value: null, disabled: true }),
    locality: new FormControl({ value: null, disabled: true }),
  });

  constructor() {}

  /*   ngOnInit() {


    console.log(
      'defaultAddressParams in address-filter',
      this.defaultAddressParams()
    );

    this.addressService.getListOfCountries().subscribe({
      next: (res) => {
        this.toponyms.countriesList = res.data; */
  //console.log('this.toponyms.countriesList');
  //console.log(this.toponyms.countriesList);
  /*
        this.onCountrySelectionChange()
          .pipe(
            concatMap(() =>
              this.defaultAddressParams()?.regionId
                ?  this.onRegionSelectionChange()
                : EMPTY
            ),
            concatMap(() =>
              this.defaultAddressParams()?.districtId
                ? this.onDistrictSelectionChange()
                : EMPTY
            ),
            concatMap(() =>
              this.defaultAddressParams()?.localityId
                ? this.onLocalitySelectionChange()
                : EMPTY
            )
          )
          .subscribe({
            next: () => console.log('All operations completed successfully'),
            error: (err) => this.errorHandling(err),
          }); */

  /*          if (this.defaultAddressParams().countryId) {
          this.setDefaultFormValue('country');
          this.onCountrySelectionChange().subscribe({
            next: () => {
              console.log('after this.onCountrySelectionChange();');
              if (this.defaultAddressParams().regionId) {
                this.setDefaultFormValue('region');
                this.onRegionSelectionChange().subscribe({
                  next: () => {
                    if (this.defaultAddressParams().districtId) {
                      this.setDefaultFormValue('district');
                      this.onDistrictSelectionChange().subscribe({
                        next: () => {
                          if (this.defaultAddressParams().localityId) {
                            this.setDefaultFormValue('locality');
                            this.onLocalitySelectionChange();
                          }
                        },
                        error: (err) => {
                          this.errorHandling(err);
                        },
                      });
                    }
                  },
                  error: (err) => {
                    this.errorHandling(err);
                  },
                });
              }
            },
            error: (err) => {
              this.errorHandling(err);
            },
          });
        }
      },
      error: (err) => {
        this.errorHandling(err);
      },
    });
  } */

  //TODO: added cond first page

  ngOnInit() {
    console.log(
      'defaultAddressParams in address-filter',
      this.defaultAddressParams()
    );

    this.addressService.getListOfCountries().subscribe({
      next: (res) => {
        this.toponyms.countriesList = res.data;

        if (this.defaultAddressParams().countryId) {
          this.setDefaultFormValue('country');
          this.onCountrySelectionChange()
            .pipe(
              concatMap(() => {
                if (this.defaultAddressParams().regionId) {
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
              next: () => console.log('All operations completed successfully'),
              error: (err) => this.errorHandling(err),
            });
        }
      },
      error: (err) => this.errorHandling(err),
    });
  }

  /*   onCountrySelectionChange0(): Observable<any> {
    return this.addressService.getListOfToponyms([143], 'regions').pipe(
      tap((res) => {
        this.toponyms.regionsList = res.data;
        console.log("this.toponyms.regionsList INSIDE CC", this.toponyms.regionsList);
        if (this.toponyms.regionsList?.length > 0) {
          this.form.get('region')?.enable();
        } else {
          this.form.get('region')?.disable();
        }
      }),
      catchError((err) => {
        this.errorHandling(err);
        return EMPTY;
      })
    );
  } */

  onCountrySelectionChange(): Observable<any> {
    console.log('onCountrySelectionChange');

    return this.onToponymSelectionChange('country', 'region', 'regions').pipe(
      tap(() => {
        this.form.get('region')?.setValue(null);
        this.form.get('district')?.disable();
        this.form.get('district')?.setValue(null);
        this.form.get('locality')?.disable();
        this.form.get('locality')?.setValue(null);
        this.emitAddressData();
      }),
      catchError((err) => {
        this.errorHandling(err);
        return EMPTY;
      })
    );
  }
  onRegionSelectionChange(): Observable<any> {
    console.log('onRegionSelectionChange');
    return this.onToponymSelectionChange(
      'region',
      'district',
      'districts'
    ).pipe(
      tap(() => {
        this.form.get('district')?.setValue(null);
        this.form.get('locality')?.disable();
        this.form.get('locality')?.setValue(null);
        this.emitAddressData();
      }),
      catchError((err) => {
        this.errorHandling(err);
        return EMPTY;
      })
    );
  }
  onDistrictSelectionChange(): Observable<any> {
    console.log('onDistrictSelectionChange');
    return this.onToponymSelectionChange(
      'district',
      'locality',
      'localities'
    ).pipe(
      tap(() => {
        this.form.get('locality')?.setValue(null);
        this.emitAddressData();
      }),
      catchError((err) => {
        this.errorHandling(err);
        return EMPTY;
      })
    );
  }
  onLocalitySelectionChange(): Observable<any> {
    console.log('onLocalitySelectionChange');
    this.emitAddressData();
    return EMPTY;
  }
  createAddressString(addressData: {
    countries: null | number[] | [];
    regions: null | number[] | [];
    districts: null | number[] | [];
    localities: null | number[] | [];
  }) {
    console.log('createAddressString start');
    console.log('addressData');
    console.log(addressData);
    let addressString = '';
    for (let key of this.objectKeys(addressData)) {
      if (
        addressData[key as keyof typeof addressData] &&
        addressData[key as keyof typeof addressData]!.length > 0
      ) {
        console.log('key');
        console.log(key);
        for (let id of addressData[key as keyof typeof addressData]!) {
          console.log('id');
          console.log(id);
          const source = key + 'List';
          console.log('source', source);
          console.log(
            'this.toponyms',
            this.toponyms /* [
              source as
                | 'countriesList'
                | 'regionsList'
                | 'districtsList'
                | 'localitiesList'
            ] */
          );

          const name = this.toponyms[
            source as
              | 'countriesList'
              | 'regionsList'
              | 'districtsList'
              | 'localitiesList'
          ].find((item) => item.id == id)!.name;

          addressString = addressString + name + ', ';

          //console.log('addressString', addressString);
        }
      }
    }

    // console.log('addressString');
    // console.log(addressString);

    console.log('createAddressString finish');
    return addressString.slice(0, -2);
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  emitAddressData() {
    console.log('emitAddressData');
    let count = 0;

    let addressData;

    if (this.params().multiple) {
      addressData = {
        countries: this.form.controls['country'].value,
        regions: this.form.controls['region'].value,
        districts: this.form.controls['district'].value,
        localities: this.form.controls['locality'].value,
      };
    } else {
      addressData = {
        countries: this.form.controls['country'].value
          ? [this.form.controls['country'].value]
          : this.form.controls['country'].value,
        regions: this.form.controls['region'].value
          ? [this.form.controls['region'].value]
          : this.form.controls['region'].value,
        districts: this.form.controls['district'].value
          ? [this.form.controls['district'].value]
          : this.form.controls['district'].value,
        localities: this.form.controls['locality'].value
          ? [this.form.controls['locality'].value]
          : this.form.controls['locality'].value,
      };
    }

    if (
      this.form.controls['country'].value &&
      this.form.controls['country'].value.length > 0
    ) {
      count = count + 1;
    }
    this.addressFilter.emit(addressData);
    this.addressFilterBadgeValue.emit(count);
    this.addressString.emit(this.createAddressString(addressData));
    this.goToFirstPage.emit();
  }

  clearForm() {
    this.form.reset();
    let addressData = {
      countries: null,
      regions: null,
      districts: null,
      localities: null,
    };

    this.addressFilterBadgeValue.emit(0);
    this.addressFilter.emit(addressData);
  }

  private errorHandling(err: any) {
    console.log(err);
    let errorMessage =
      typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
    this.messageService.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: errorMessage,
      sticky: true,
    });
  }

  private setDefaultFormValue(
    key: 'country' | 'region' | 'district' | 'locality'
  ) {
    const toponymType:
      | 'countryId'
      | 'regionId'
      | 'districtId'
      | 'localityId' = `${key}Id`;

    const defaultAddressParams = this.defaultAddressParams()[toponymType]
      ? +this.defaultAddressParams()[toponymType]!
      : this.defaultAddressParams()[toponymType];
    const defaultValue = this.params().multiple
      ? [defaultAddressParams]
      : defaultAddressParams;
    this.form.controls[key]?.setValue(defaultValue);
    this.cdr.detectChanges();
    console.log(
      `this.form.controls['${key}'].value`,
      this.form.controls[key]?.value
    );
  }

  private onToponymSelectionChange(
    key: 'country' | 'region' | 'district' | 'locality',
    nextKey: 'region' | 'district' | 'locality',
    typeOfList: 'regions' | 'districts' | 'localities'
  ): Observable<any> {
    if (
      (!this.params().multiple && this.form.controls[key].value) ||
      (this.params().multiple &&
        this.form.controls[key].value &&
        this.form.controls[key].value.length > 0)
    ) {
      const idValues = !this.params().multiple
        ? [this.form.controls[key].value]
        : this.form.controls[key].value;
      console.log('idValues');
      console.log(idValues);

      return this.addressService.getListOfToponyms(idValues, typeOfList).pipe(
        tap((res) => {
          this.toponyms[`${typeOfList}List` as keyof typeof this.toponyms] =
            res.data;
          console.log('this.toponymsList INSIDE CC', res.data);
          if (res.data && res.data.length > 0) {
            this.form.get(nextKey)?.enable();
          } else {
            this.form.get(nextKey)?.disable();
          }
        }),
        catchError((err) => {
          this.errorHandling(err);
          return EMPTY;
        })
      );

      /*       this.addressService.getListOfToponyms(idValues, typeOfList).subscribe({
        next: (res) => {
          this.toponyms[`${key}List` as keyof typeof this.toponyms] = res.data;

          console.log(
            'this.toponymsList INSIDE CC',
            res.data
          );
          if (
            res.data &&
            res.data.length > 0
          ) {
            this.form.get(nextKey)?.enable();
          } else {
            this.form.get(nextKey)?.disable();
          }
        },
        error: (err) => {
          this.errorHandling(err);
        },
      }); */
    } else {
      this.form.get(nextKey)?.disable();
      return EMPTY;
    }
  }

  /*   private updateFormControl(key: string, data: any[], enableOnData: boolean) {
    this.form.controls[key]?.setValue(null);
    this.form.controls[key]?.disable();

    if (enableOnData && data.length > 0) {
      this.toponyms[`${key}List` as keyof typeof this.toponyms] = data;
      this.form.controls[key]?.enable();
    }
  } */
}
