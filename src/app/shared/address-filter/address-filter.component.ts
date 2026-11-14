import {
  Component,
  DestroyRef,
  ChangeDetectorRef,
  inject,
  input,
  output,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSelectModule } from '@angular/material/select';
import {
  EMPTY,
  Observable,
  catchError,
  concatMap,
  filter,
  finalize,
  of,
  tap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AddressKey,
  ToponymListMap,
  ToponymType,
  typedKeys,
  DefaultAddressParams,
  AddressFilterParams,
  AddressFilter,
  ToponymNamesList,
  typeOfListMap,
  typeMap,
  keyMap,
  fields,
  controlMap,
} from '../../interfaces/toponym';
import { MessageWrapperService } from '../../services/message.service';
import { AddressService } from '../../services/address.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-address-filter',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatGridListModule,
    MatSelectModule,
    TranslateModule,
  ],
  templateUrl: './address-filter.component.html',
  styleUrl: './address-filter.component.css',
})
export class AddressFilterComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly addressService = inject(AddressService);
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
  showSpinner = output<boolean>();

  form = new FormGroup<Record<string, AbstractControl>>({});
  // null for single-select, [] for multi-select
  private emptyValue: null | [] = null;
  private hierarchyGeneration = 0;

  // --- lifecycle ---
  ngOnInit() {
    // decide empty value by `multiple`
    this.emptyValue = this.params().multiple ? [] : null;

    // build controls
    this.addControl('country', this.params().source === 'toponymCard');
    this.addControl('region', this.params().source === 'toponymCard', true);
    this.addControl('district', this.params().source === 'toponymCard', true);
    this.addControl('locality', false, true);


    if (this.params().readonly) this.form.get('country')?.disable();

    // initial load of countries
    const generation = ++this.hierarchyGeneration;
    this.addressService
      .getListOfToponyms([], 'countries')
      .pipe(
        filter(() => this.isCurrentHierarchy(generation)),
        concatMap((res) => {
          this.toponymsList.countriesList = res.data;

          // preselect chain from defaults (if any)
          if (this.defaultAddressParams().countryId) {
            this.setDefaultFormValue('country');
            return this.onCountrySelectionChange(false, generation)
              .pipe(
                concatMap(() =>
                  this.isCurrentHierarchy(generation) && this.defaultAddressParams().regionId
                    ? (this.setDefaultFormValue('region'),
                      this.onRegionSelectionChange(false, generation))
                    : EMPTY,
                ),
                concatMap(() =>
                  this.isCurrentHierarchy(generation) && this.defaultAddressParams().districtId
                    ? (this.setDefaultFormValue('district'),
                      this.onDistrictSelectionChange(false, generation))
                    : EMPTY,
                ),
                concatMap(() =>
                  this.isCurrentHierarchy(generation) && this.defaultAddressParams().localityId
                    ? (this.setDefaultFormValue('locality'),
                      this.onLocalitySelectionChange(false, generation))
                    : EMPTY,
                ),
              );
          }
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.showSpinner.emit(false)),
      )
      .subscribe({
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'AddressFilterComponent',
            stage: 'setDefaultFormValue',
          }),
      });
  }

  // --- API for parent (card/list) ---
  onChangeMode(mode: string, data: DefaultAddressParams | null) {
    const generation = ++this.hierarchyGeneration;
    if (mode == 'edit') {
      this.params().class = 'none';
      this.params().readonly = false;

      if (
        this.params().source === 'homeCard' ||
        this.params().source === 'toponymCard'
      ) {
        // enable all controls if not userCard
        this.enableChain(['country', 'region', 'district', 'locality']);
      }

      if (
        this.params().source === 'userCard' ||
        this.params().source === 'partnerCard' ||
        this.params().source === 'volunteerCard' ||
        (this.params().source === 'homeCard' && data !== null)
      ) {
        if (data) {
          this.form.controls['country'].setValue(data.countryId);
          this.selectionChangeMethods
            .onCountrySelectionChange(true, generation)
            .pipe(
              concatMap(
                () => this.isCurrentHierarchy(generation) ? (
                  this.form.controls['region'].setValue(data.regionId),
                  this.selectionChangeMethods.onRegionSelectionChange(true, generation)
                ) : EMPTY,
              ),
              concatMap(
                () => this.isCurrentHierarchy(generation) ? (
                  this.form.controls['district'].setValue(data.districtId),
                  this.selectionChangeMethods.onDistrictSelectionChange(true, generation)
                ) : EMPTY,
              ),
              concatMap(
                () => this.isCurrentHierarchy(generation) ? (
                  this.form.controls['locality'].setValue(data.localityId),
                  this.selectionChangeMethods.onLocalitySelectionChange(true, generation)
                ) : EMPTY,
              ),
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              error: (err) =>
                this.msgWrapper.handle(err, {
                  source: 'AddressFilterComponent',
                  stage: 'onChangeMode',
                  mode,
                  data,
                }),
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
      this.emitAddressData();
      return;
    }
    // view mode
    this.params().class = 'view-mode';
    this.params().readonly = true;

    if (data) {
      this.form.controls['country'].setValue(data.countryId);
      this.selectionChangeMethods
        .onCountrySelectionChange(true, generation)
        .pipe(
          concatMap(
            () => this.isCurrentHierarchy(generation) ? (
              this.form.controls['region'].setValue(data.regionId),
              this.selectionChangeMethods.onRegionSelectionChange(true, generation)
            ) : EMPTY,
          ),
          concatMap(
            () => this.isCurrentHierarchy(generation) ? (
              this.form.controls['district'].setValue(data.districtId),
              this.selectionChangeMethods.onDistrictSelectionChange(true, generation)
            ) : EMPTY,
          ),
          concatMap(
            () => this.isCurrentHierarchy(generation) ? (
              this.form.controls['locality'].setValue(data.localityId),
              this.selectionChangeMethods.onLocalitySelectionChange(true, generation)
            ) : EMPTY,
          ),
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: (err) =>
            this.msgWrapper.handle(err, {
              source: 'AddressFilterComponent',
              stage: 'onChangeMode',
              mode,
              data,
            }),
        });
    } else {
      this.disableChain(['country', 'region', 'district', 'locality']);
    }
  }

  // --- selection change handlers (public) ---
  handleToponymSelectionChange(
    methodName: keyof AddressFilterComponent['selectionChangeMethods'],
    levelName: 'Country' | 'Region' | 'District' | 'Locality',
  ): void {
    this.selectionChangeMethods[methodName]().subscribe({
      error: (err) =>
        this.msgWrapper.handle(err, {
          source: 'AddressFilterComponent',
          stage: 'handleToponymSelectionChange',
          type: levelName,
        }),
    });
  }

  onCountrySelectionChange(isEmit = true, generation = ++this.hierarchyGeneration): Observable<any> {
    if (!this.isCurrentHierarchy(generation)) return EMPTY;
    const request$ = this.onToponymSelectionChange('country', 'region', 'regions', generation);
    if (isEmit) this.emitAddressData();
    return request$.pipe(
      catchError((err) => {
        this.msgWrapper.handle(err, {
          source: 'AddressFilterComponent',
          stage: 'onCountrySelectionChange',
        });
        return EMPTY;
      }),
    );
  }
  onRegionSelectionChange(isEmit = true, generation = ++this.hierarchyGeneration): Observable<any> {
    if (!this.isCurrentHierarchy(generation)) return EMPTY;
    const request$ = this.onToponymSelectionChange('region', 'district', 'districts', generation);
    if (isEmit) this.emitAddressData();
    return request$.pipe(
      catchError((err) => {
        this.msgWrapper.handle(err, {
          source: 'AddressFilterComponent',
          stage: 'onRegionSelectionChange',
        });
        return EMPTY;
      }),
    );
  }
  onDistrictSelectionChange(isEmit = true, generation = ++this.hierarchyGeneration): Observable<any> {
    if (!this.isCurrentHierarchy(generation)) return EMPTY;
    const request$ = this.onToponymSelectionChange('district', 'locality', 'localities', generation);
    if (isEmit) this.emitAddressData();
    return request$.pipe(
      catchError((err) => {
        this.msgWrapper.handle(err, {
          source: 'AddressFilterComponent',
          stage: 'onDistrictSelectionChange',
        });
        return EMPTY;
      }),
    );
  }
  onLocalitySelectionChange(isEmit = true, generation = ++this.hierarchyGeneration): Observable<any> {
    if (!this.isCurrentHierarchy(generation)) return EMPTY;
    if (this.params().readonly) this.disableChain(['locality']);
    if (isEmit) this.emitAddressData();
    return EMPTY;
  }

  // map UI handlers for template indirection
  private selectionChangeMethods = {
    onCountrySelectionChange: this.onCountrySelectionChange.bind(this),
    onRegionSelectionChange: this.onRegionSelectionChange.bind(this),
    onDistrictSelectionChange: this.onDistrictSelectionChange.bind(this),
    onLocalitySelectionChange: this.onLocalitySelectionChange.bind(this),
  };

  // --- helpers ---
  // One generation owns the whole chain; newer intent invalidates its responses and continuations.
  private isCurrentHierarchy(generation: number): boolean {
    return generation === this.hierarchyGeneration;
  }

  /** Add form control with optional required and initial disabled state */
  private addControl(name: ToponymType, required: boolean, disabled = false) {
    this.form.addControl(
      name,
      new FormControl(
        { value: this.emptyValue, disabled },
        required ? [Validators.required] : [],
      ),
    );
  }

  /** Enable a chain of controls */
  private enableChain(names: ToponymType[]) {
    names.forEach((n) => this.form.get(n)?.enable());
  }

  /** Disable a chain of controls */
  private disableChain(names: ToponymType[]) {
    names.forEach((n) => this.form.get(n)?.disable());
  }

  /** Reset controls to empty value  */
  private resetChain(names: ToponymType[]) {
    names.forEach((n) => {
      this.form.get(n)?.setValue(this.emptyValue);
    });
  }

  /** Set default value (single or multiple) by `ToponymType` */
  private setDefaultFormValue(key: ToponymType) {
    const toponymIdType:
      | 'countryId'
      | 'regionId'
      | 'districtId'
      | 'localityId' = `${key}Id`;

    const defaultAddressParams = this.defaultAddressParams()[toponymIdType];
    const defaultValue = this.params().multiple
      ? [defaultAddressParams]
      : defaultAddressParams;
    this.form.controls[key]?.setValue(defaultValue);
    this.cdr.detectChanges();
  }

  /** Load next-level list based on current selection; enable/disable next control */
  private onToponymSelectionChange(
    key: 'country' | 'region' | 'district',
    nextKey: 'region' | 'district' | 'locality',
    typeOfList: 'regions' | 'districts' | 'localities',
    generation: number,
  ): Observable<any> {
    const descendants: ToponymType[] = key === 'country'
      ? ['region', 'district', 'locality']
      : key === 'region' ? ['district', 'locality'] : ['locality'];
    this.resetChain(descendants);
    this.disableChain(descendants);
    descendants.forEach((level) => this.toponymsList[typeMap[level]] = []);
    if (this.params().readonly) this.form.get(key)?.disable();

    const ctrl = this.form.controls[key];
    // normalize selected ids to array
    const idValues = this.params().multiple
      ? (ctrl.value as number[])
      : ctrl.value != null
        ? [ctrl.value as number]
        : [];

    if (!idValues.length) {
      this.toponymsList[`${typeOfList}List` as keyof ToponymListMap] = [];
      this.form.get(nextKey)?.disable();
      return of(null);
    }

    return this.fetchAndApplyToponyms(idValues, key, typeOfList, nextKey, generation);
  }

  private fetchAndApplyToponyms(
    idValues: number[],
    type: ToponymType,
    typeOfList: 'countries' | 'regions' | 'districts' | 'localities',
    nextKey?: 'region' | 'district' | 'locality',
    generation = this.hierarchyGeneration,
  ): Observable<any> {
    return this.addressService.getListOfToponyms(idValues, typeOfList).pipe(
      filter(() => this.isCurrentHierarchy(generation)),
      tap((res) => {
        this.toponymsList[`${typeOfList}List` as keyof ToponymListMap] =
          res.data;
        if (nextKey) {
          res.data?.length && !this.params().readonly
            ? this.form.get(nextKey)?.enable()
            : this.form.get(nextKey)?.disable();
        } else {
          res.data?.length && !this.params().readonly
            ? this.form.get(type)?.enable()
            : this.form.get(type)?.disable();
        }
      }),
      catchError((err) => {
        this.msgWrapper.handle(err, {
          source: 'AddressFilterComponent',
          stage: 'onToponymSelectionChange',
          type,
        });
        return EMPTY;
      }),
    );
  }

  //only for ToponymsListComponent to reset table after creating, editing, deleting, uploading
  correctSelectionList(
    type: ToponymType,
    addressFilter: AddressFilter,
    id: number = -1,
  ) {
    const parentIdMap: Record<ToponymType, number[]> = {
      country: [],
      region: addressFilter.countries,
      district: addressFilter.regions,
      locality: addressFilter.districts,
    };

    if (this.toponymsList[typeMap[type]].length || parentIdMap[type].length) {
      this.fetchAndApplyToponyms(
        parentIdMap[type],
        type,
        typeOfListMap[type],
        undefined,
        ++this.hierarchyGeneration,
      ).subscribe({
        next: () => {
          if (this.form.get(type)?.value && this.form.get(type)?.value == id) {
            this.resetChain([type]);
            this.emitAddressData();
          }
        },
        error: () => {
          /* fetchAndApplyToponyms */
        },
      });
    }
  }

  /** Build readable string from selected IDs */
  private createAddressString(addressData: AddressFilter): string {
    let addressString = '';
    for (const key of typedKeys(addressData)) {
      const ids = addressData[key];
      if (!ids.length) continue;
      const list: ToponymNamesList = this.toponymsList[keyMap[key]];
      for (const id of ids) {
        const name = list.find((item) => item.id === id)?.name;
        if (name) {
          addressString += name + ', ';
        }
      }
    }
    return addressString.slice(0, -2);
  }

  /** Emit full filter payload + decorations (badge, string, page reset) */
  emitAddressData() {
    const addressData = Object.fromEntries(
      fields.map((field) => {
        const value = this.form.controls[controlMap[field]].value;
        const values = this.params().multiple ? value : value ? [value] : [];
        return [field, values];
      }),
    ) as AddressFilter;

    // Emit main filter
    this.addressFilter.emit(addressData);

    // In lists we also emit badge/string + ask parent to reset page
    if (
      this.params().source != 'toponymCard' &&
      this.params().source != 'userCard'
    ) {
      const badge = addressData.countries.length > 0 ? 1 : 0;
      this.addressFilterBadgeValue.emit(badge);
      this.addressString.emit(this.createAddressString(addressData));
      this.goToFirstPage.emit();
    }
  }

  // --- public API from template ---
  clearForm(countryId: number | [] | null = this.emptyValue) {
    this.form.reset({
      country: countryId,
      region: this.emptyValue,
      district: this.emptyValue,
      locality: this.emptyValue,
    });

    // reload chain from empty country state
    this.handleToponymSelectionChange('onCountrySelectionChange', 'Country');

    this.addressFilterBadgeValue.emit(0);
    this.addressFilter.emit({
      countries: [],
      regions: [],
      districts: [],
      localities: [],
    });
  }
}
