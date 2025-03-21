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

  /*   chosenCountryId = signal<number | null>(null);
  chosenRegionId = signal<number | null>(null);
  chosenDistrictId = signal<number | null>(null);
  chosenLocalityId = signal<number | null>(null); */

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

  ngOnInit() {
    this.addressService.getListOfCountries().subscribe({
      next: (res) => {
        this.toponyms.countriesList = res.data;
        //    console.log('this.countriesListOnInit');
        //   console.log(this.countriesList);
        if (this.defaultAddressParams().countryId) {
          const defaultCountryId = this.params().multiple
            ? [this.defaultAddressParams().countryId]
            : this.defaultAddressParams().countryId;
          this.form.controls['country'].setValue(defaultCountryId);
          // this.chosenCountryId.set(143);
          this.onCountrySelectionChange();
          if (this.defaultAddressParams().regionId) {
            const defaultRegionId = this.params().multiple
              ? [this.defaultAddressParams().regionId]
              : this.defaultAddressParams().regionId;
            this.form.controls['region'].setValue(defaultRegionId);
            // this.chosenCountryId.set(143);
            this.onRegionSelectionChange();
          }
          if (this.defaultAddressParams().districtId) {
            const defaultDistrictId = this.params().multiple
              ? [this.defaultAddressParams().districtId]
              : this.defaultAddressParams().districtId;
            this.form.controls['district'].setValue(defaultDistrictId);
            // this.chosenCountryId.set(143);
            this.onDistrictSelectionChange();
          }
          if (this.defaultAddressParams().localityId) {
            const defaultLocalityId = this.params().multiple
              ? [this.defaultAddressParams().localityId]
              : this.defaultAddressParams().localityId;
            this.form.controls['locality'].setValue(defaultLocalityId);
            // this.chosenCountryId.set(143);
            this.onLocalitySelectionChange();
          }
        }
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
  onCountrySelectionChange() {
    if (
      (!this.params().multiple && this.form.controls['country'].value) ||
      (this.params().multiple &&
        this.form.controls['country'].value &&
        this.form.controls['country'].value.length > 0)
    ) {
      const idValues = !this.params().multiple
        ? [this.form.controls['country'].value]
        : this.form.controls['country'].value;
      // console.log('idValues');
      //console.log(idValues);
      this.addressService.getListOfRegionsOfCountries(idValues).subscribe({
        next: (res) => {
          this.toponyms.regionsList = res.data;
          if (
            this.toponyms.regionsList &&
            this.toponyms.regionsList.length > 0
          ) {
            this.form.get('region')?.enable();
          } else {
            this.form.get('region')?.disable();
          }
        },
        error: (err) => {
          console.log(err);
          let errorMessage =
            typeof err.error === 'string'
              ? err.error
              : 'Ошибка: ' + err.message;
          this.messageService.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: errorMessage,
            sticky: true,
          });
        },
      });
    } else {
      this.form.get('region')?.disable();
    }
    this.form.get('region')?.setValue(null);
    this.form.get('district')?.disable();
    this.form.get('district')?.setValue(null);
    this.form.get('locality')?.disable();
    this.form.get('locality')?.setValue(null);
    this.emitAddressData();
    /*     console.log('this.regionsList2');
    console.log(this.regionsList);
    console.log(this.chosenCountryId());
    this.chosenCountryId.set(this.form.controls['country'].value); */
  }
  onRegionSelectionChange() {
    if (
      (!this.params().multiple && this.form.controls['region'].value) ||
      (this.params().multiple &&
        this.form.controls['region'].value &&
        this.form.controls['region'].value.length > 0)
    ) {
      const idValues = !this.params().multiple
        ? [this.form.controls['region'].value]
        : this.form.controls['region'].value;
      this.addressService.getListOfDistrictsOfRegions(idValues).subscribe({
        next: (res) => {
          this.toponyms.districtsList = res.data;
          if (
            this.toponyms.districtsList &&
            this.toponyms.districtsList.length > 0
          ) {
            this.form.get('district')?.enable();
          } else {
            this.form.get('district')?.disable();
          }
        },
        error: (err) => {
          console.log(err);
          let errorMessage =
            typeof err.error === 'string'
              ? err.error
              : 'Ошибка: ' + err.message;
          this.messageService.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: errorMessage,
            sticky: true,
          });
        },
      });
    } else {
      this.form.get('district')?.disable();
    }
    this.form.get('district')?.setValue(null);
    this.form.get('locality')?.disable();
    this.form.get('locality')?.setValue(null);
    //this.chosenRegionId.set(this.form.controls['region'].value);
    //this.getToponyms();
    this.emitAddressData();
  }
  onDistrictSelectionChange() {
    if (
      (!this.params().multiple && this.form.controls['district'].value) ||
      (this.params().multiple &&
        this.form.controls['district'].value &&
        this.form.controls['district'].value.length > 0)
    ) {
      const idValues = !this.params().multiple
        ? [this.form.controls['district'].value]
        : this.form.controls['district'].value;
      this.addressService.getListOfLocalitiesOfDistricts(idValues).subscribe({
        next: (res) => {
          this.toponyms.localitiesList = res.data;
          if (
            this.toponyms.localitiesList &&
            this.toponyms.localitiesList.length > 0
          ) {
            this.form.get('locality')?.enable();
          } else {
            this.form.get('locality')?.disable();
          }
        },
        error: (err) => {
          console.log(err);
          let errorMessage =
            typeof err.error === 'string'
              ? err.error
              : 'Ошибка: ' + err.message;
          this.messageService.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: errorMessage,
            sticky: true,
          });
        },
      });
    } else {
      this.form.get('locality')?.disable();
    }
    this.form.get('locality')?.setValue(null);
    this.emitAddressData();
    //this.chosenDistrictId.set(this.form.controls['district'].value);
    // this.getToponyms();
  }
  onLocalitySelectionChange() {
    this.emitAddressData();
    // this.chosenLocalityId.set(this.form.controls['locality'].value);
    // this.getToponyms();
  }
  createAddressString(addressData: {
    countries: null | number[] | [];
    regions: null | number[] | [];
    districts: null | number[] | [];
    localities: null | number[] | [];
  }) {
    // console.log('addressData');
    //console.log(addressData);
    let addressString = '';
    for (let key of this.objectKeys(addressData)) {
      if (
        addressData[key as keyof typeof addressData] &&
        addressData[key as keyof typeof addressData]!.length > 0
      ) {
        //console.log('key');
        //console.log(key);
        for (let id of addressData[key as keyof typeof addressData]!) {
          // console.log('addressData - item');
          // console.log(id);
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

    // console.log('addressString');
    // console.log(addressString);
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
}
