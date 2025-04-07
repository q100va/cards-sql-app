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
import { EMPTY, Observable, catchError, concatMap, of, tap } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { AddressFilterParams } from '../../interfaces/address-filter-params';
import { GeographyLevels } from '../../interfaces/types';
import { DefaultAddressParams } from '../../interfaces/default-address-params';
import { AddressFilter } from '../../interfaces/address-filter';

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

  params = input.required<AddressFilterParams>();
  defaultAddressParams = input.required<DefaultAddressParams>();

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

  addressFilter = output<AddressFilter>();
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
  //TODO: spinner?
  ngOnInit() {
    console.log(
      'params in address-filter',
      this.params()
    );


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
                  console.log('in process');
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
                console.log('All operations completed successfully');
              },
              error: (err) => this.errorHandling(err),
            });
        }
      },
      error: (err) => this.errorHandling(err),
    });

    /*       this.addressService.getListOfCountries().subscribe({
        next: (res) => {
          this.toponyms.countriesList = res.data;
          if (this.defaultAddressParams().countryId) {
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
                console.log('All operations completed successfully');
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
      }); */
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
      error: (err) => {
        this.errorHandling(err);
      },
    });
  }

  onCountrySelectionChange(): Observable<any> {
    return this.onToponymSelectionChange('country', 'region', 'regions').pipe(
      tap(() => {
        this.form.get('region')?.setValue(null);
        this.form.get('district')?.disable();
        this.form.get('district')?.setValue(null);
        this.toponyms.districtsList = [];
        this.form.get('locality')?.disable();
        this.form.get('locality')?.setValue(null);
        this.toponyms.localitiesList = [];
        if (this.params().readonly) this.form.get('country')?.disable();

        this.emitAddressData();
      }),
      catchError((err) => {
        this.errorHandling(err);
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
        this.form.get('district')?.setValue(null);
        this.form.get('locality')?.disable();
        this.form.get('locality')?.setValue(null);
        this.toponyms.localitiesList = [];
        if (this.params().readonly) this.form.get('region')?.disable();
        this.emitAddressData();
      }),
      catchError((err) => {
        this.errorHandling(err);
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
        this.form.get('locality')?.setValue(null);
        if (this.params().readonly) this.form.get('district')?.disable();
        this.emitAddressData();
      }),
      catchError((err) => {
        this.errorHandling(err);
        return EMPTY;
      })
    );
  }
  onLocalitySelectionChange(): Observable<any> {
    if (this.params().readonly) this.form.get('locality')?.disable();
    this.emitAddressData();
    return EMPTY;
  }
  createAddressString(addressData: AddressFilter) {
    let addressString = '';
    for (let key of this.objectKeys(addressData)) {
      if (
        addressData[key as keyof typeof addressData] &&
        addressData[key as keyof typeof addressData]!.length > 0
      ) {
        for (let id of addressData[key as keyof typeof addressData]!) {
          const source = key + 'List';
          const name = this.toponyms[
            source as
              | 'countriesList'
              | 'regionsList'
              | 'districtsList'
              | 'localitiesList'
          ].find((item) => item.id == id)!.name;
          addressString = addressString + name + ', ';
        }
      }
    }
    return addressString.slice(0, -2);
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  emitAddressData() {
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
    console.log('this.emitAddressData', addressData);
    this.addressFilter.emit(addressData);
    if (this.params().source != 'toponymCard') {
      this.addressFilterBadgeValue.emit(count);
      this.addressString.emit(this.createAddressString(addressData));
      this.goToFirstPage.emit();
    }
  }

  onChangeMode(
    mode: string,
    data: DefaultAddressParams | null
  ) {
    if (mode == 'edit') {
      this.form.get('country')?.enable();
      this.form.get('region')?.enable();
      this.form.get('district')?.enable();
      this.form.get('locality')?.enable();
      this.params().class = 'none';
      this.params().readonly = false;
      this.emitAddressData();
    }
    if (mode == 'view') {
      console.log('onChangeMode');
      this.params().class = 'view-mode';
      this.params().readonly = true;
      if (data) {
        // Sequentially execute the steps using concatMap
        this.selectionChangeMethods['onCountrySelectionChange']()
          .pipe(
            tap(() => {
              this.form.controls['country'].setValue(data?.countryId);
              console.log('Country ID:', data?.countryId);
            }),
            concatMap(() => {
              this.form.controls['region'].setValue(data?.regionId);
              console.log('Region ID:', data?.regionId);
              return this.selectionChangeMethods['onRegionSelectionChange']();
            }),
            concatMap(() => {
              this.form.controls['district'].setValue(data?.districtId);
              console.log('District ID:', data?.districtId);
              return this.selectionChangeMethods['onDistrictSelectionChange']();
            }),
            concatMap(() => {
              this.form.controls['locality'].setValue(data?.localityId);
              console.log('Locality ID:', data?.localityId);
              return this.selectionChangeMethods['onLocalitySelectionChange']();
            })
          )
          .subscribe({
            next: () => console.log('All selection changes completed'),
            error: (err) => this.errorHandling(err),
          });
      } else {
        this.form.get('country')?.disable();
        this.form.get('region')?.disable();
        this.form.get('district')?.disable();
        this.form.get('locality')?.disable();
      }
    }

    /*       this.form.controls['country'].setValue(data?.countryId);
      console.log(data?.countryId);
      this.handleToponymSelectionChange('onCountrySelectionChange', 'Country');
      this.form.controls['region'].setValue(data?.regionId);
      console.log(data?.regionId);
      this.handleToponymSelectionChange('onRegionSelectionChange', 'Region');
      this.form.controls['district'].setValue(data?.districtId);
      console.log(data?.districtId);
      this.handleToponymSelectionChange('onDistrictSelectionChange', 'District');
      this.form.controls['locality'].setValue(data?.localityId);
      console.log(data?.localityId);
      this.handleToponymSelectionChange('onLocalitySelectionChange', 'Locality'); */
    /*       this.form.get('country')?.disable();
      this.form.get('region')?.disable();
      this.form.get('district')?.disable();
      this.form.get('locality')?.disable();
      this.emitAddressData(); */
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
    key: GeographyLevels
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
  }

  private onToponymSelectionChange(
    key: 'country' | 'region' | 'district' | 'locality',
    nextKey: 'region' | 'district' | 'locality',
    typeOfList: 'regions' | 'districts' | 'localities'
  ): Observable<any> {
    const idValues = !this.params().multiple
      ? [this.form.controls[key].value]
      : this.form.controls[key].value;

    return this.addressService.getListOfToponyms(idValues, typeOfList).pipe(
      tap((res) => {
        this.toponyms[`${typeOfList}List` as keyof typeof this.toponyms] =
          res.data;
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
  }
}
