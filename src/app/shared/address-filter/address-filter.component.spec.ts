// src/app/shared/address-filter/address-filter.component.spec.ts
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { of, EMPTY, throwError, defer } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { AddressFilterComponent } from './address-filter.component';
import { AddressService } from '../../services/address.service';
import { MessageWrapperService } from '../../services/message.service';
import {
  AddressFilterParams,
  DefaultAddressParams,
} from '../../interfaces/toponym';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Component, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { ToponymNamesList, ToponymType } from '../../interfaces/toponym';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { environment } from '../../../environments/environment';

class EmptyLoader implements TranslateLoader {
  getTranslation() {
    return of({});
  }
}

describe('AddressFilterComponent', () => {
  let fixture: ComponentFixture<AddressFilterComponent>;
  let component: AddressFilterComponent;

  let addressSpy: jasmine.SpyObj<AddressService>;
  let msgSpy: jasmine.SpyObj<MessageWrapperService>;

  const params: AddressFilterParams = {
    source: 'toponymList', // list mode to emit badge/string/page-reset
    multiple: false,
    cols: '1',
    gutterSize: '8px',
    rowHeight: '76px',
    isShowCountry: true,
    isShowRegion: true,
    isShowDistrict: true,
    isShowLocality: true,
    class: 'none',
  };

  const defaults: DefaultAddressParams = {
    countryId: null,
    regionId: null,
    districtId: null,
    localityId: null,
  };

  beforeEach(async () => {
    addressSpy = jasmine.createSpyObj<AddressService>('AddressService', ['getListOfToponyms']);
    msgSpy = jasmine.createSpyObj<MessageWrapperService>('MessageWrapperService', ['handle']);

    // default countries load
    addressSpy.getListOfToponyms.and.returnValue(
      of({ data: [{ id: 1, name: 'Russia' }] })
    );

    await TestBed.configureTestingModule({
      imports: [
        AddressFilterComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyLoader },
        }),
      ],
      providers: [
        { provide: AddressService, useValue: addressSpy },
        { provide: MessageWrapperService, useValue: msgSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddressFilterComponent);
    component = fixture.componentInstance;

    // provide inputs
    fixture.componentRef.setInput('params', { ...params });
    fixture.componentRef.setInput('defaultAddressParams', { ...defaults });

    fixture.detectChanges(); // triggers ngOnInit
  });

  // --------------------------------------------------------------------------
  // builds controls and loads countries
  // --------------------------------------------------------------------------
  it('builds form and loads countries on init', () => {
    expect(component.form.get('country')).toBeTruthy();
    expect(component.form.get('region')).toBeTruthy();
    expect(component.form.get('district')).toBeTruthy();
    expect(component.form.get('locality')).toBeTruthy();

    expect(addressSpy.getListOfToponyms).toHaveBeenCalledWith([], 'countries');
    expect(component.toponymsList.countriesList.length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // country change with empty selection disables chain and emits filter payload
  // --------------------------------------------------------------------------
  it('onCountrySelectionChange with empty selection disables chain and emits', (done) => {
    // spy outputs
    const filterSpy = spyOn(component.addressFilter, 'emit');
    const badgeSpy = spyOn(component.addressFilterBadgeValue, 'emit');
    const strSpy = spyOn(component.addressString, 'emit');
    const pageSpy = spyOn(component.goToFirstPage, 'emit');

    // empty selection
    component.form.get('country')!.setValue(null);

    component.onCountrySelectionChange().subscribe({
      complete: () => {
        // region/district/locality disabled
        expect(component.form.get('region')!.disabled).toBeTrue();
        expect(component.form.get('district')!.disabled).toBeTrue();
        expect(component.form.get('locality')!.disabled).toBeTrue();

        // emitted empty filter + list decorations
        expect(filterSpy).toHaveBeenCalledWith({
          countries: [],
          regions: [],
          districts: [],
          localities: [],
        });
        expect(badgeSpy).toHaveBeenCalledWith(0);
        expect(strSpy).toHaveBeenCalled(); // empty string is fine
        expect(pageSpy).toHaveBeenCalled();

        done();
      },
    });
  });

  // --------------------------------------------------------------------------
  // edit/view modes toggle enabling/disabling chain
  // --------------------------------------------------------------------------
  it('onChangeMode toggles card controls between edit and view', () => {
    fixture.componentRef.setInput('params', { ...params, source: 'toponymCard' } satisfies AddressFilterParams);
    component.onChangeMode('view', null);

    expect(component.form.get('country')!.disabled).toBeTrue();
    expect(component.form.get('region')!.disabled).toBeTrue();
    expect(component.form.get('district')!.disabled).toBeTrue();
    expect(component.form.get('locality')!.disabled).toBeTrue();

    // Card editing enables the full address hierarchy.
    component.onChangeMode('edit', null);
    expect(component.form.get('country')!.enabled).toBeTrue();
    expect(component.form.get('region')!.enabled).toBeTrue();
    expect(component.form.get('district')!.enabled).toBeTrue();
    expect(component.form.get('locality')!.enabled).toBeTrue();

    // view mode with no data disables chain
    component.onChangeMode('view', null);
    expect(component.form.get('country')!.disabled).toBeTrue();
    expect(component.form.get('region')!.disabled).toBeTrue();
    expect(component.form.get('district')!.disabled).toBeTrue();
    expect(component.form.get('locality')!.disabled).toBeTrue();
  });

  // --------------------------------------------------------------------------
  // emitAddressData builds payload + badge/string in list mode
  // --------------------------------------------------------------------------
  it('emitAddressData emits filter + badge/string + page reset in list mode', () => {
    // seed lists for string building
    component.toponymsList.countriesList = [{ id: 1, name: 'Russia' }];
    component.toponymsList.regionsList = [{ id: 2, name: 'Tula' }];
    component.toponymsList.districtsList = [{ id: 3, name: 'District' }];
    component.toponymsList.localitiesList = [{ id: 4, name: 'Town' }];

    // select values
    component.form.get('country')!.setValue(1);
    component.form.get('region')!.setValue(2);
    component.form.get('district')!.setValue(3);
    component.form.get('locality')!.setValue(4);

    const filterSpy = spyOn(component.addressFilter, 'emit');
    const badgeSpy = spyOn(component.addressFilterBadgeValue, 'emit');
    const strSpy = spyOn(component.addressString, 'emit');
    const pageSpy = spyOn(component.goToFirstPage, 'emit');

    component.emitAddressData();

    expect(filterSpy).toHaveBeenCalledWith({
      countries: [1],
      regions: [2],
      districts: [3],
      localities: [4],
    });
    expect(badgeSpy).toHaveBeenCalledWith(1);
    expect(strSpy).toHaveBeenCalledWith('Russia, Tula, District, Town');
    expect(pageSpy).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // handleToponymSelectionChange forwards errors to MessageWrapperService
  // --------------------------------------------------------------------------
it('handleToponymSelectionChange handles errors via MessageWrapperService', () => {
  // make the inner method return a failing observable
  const failing$ = defer(() => throwError(() => new Error('boom')));

  // override the field directly
  (component as any).selectionChangeMethods = {
    onCountrySelectionChange: () => failing$,
    onRegionSelectionChange: () => failing$,
    onDistrictSelectionChange: () => failing$,
    onLocalitySelectionChange: () => failing$,
  };

  // call wrapper (it subscribes internally and should handle the error)
  component.handleToponymSelectionChange('onCountrySelectionChange', 'Country');

  expect(msgSpy.handle).toHaveBeenCalled();
  const errArg = msgSpy.handle.calls.mostRecent().args[0] as any;
  expect(errArg instanceof Error && errArg.message).toBe('boom');
});
});

@Component({
  imports: [AddressFilterComponent],
  template: `<app-address-filter [params]="params" [defaultAddressParams]="defaults"
    (showSpinner)="loading.set($event)"></app-address-filter>`,
})
class AsyncAddressHostComponent {
  address = viewChild.required(AddressFilterComponent);
  // Dialogs own loading; the child releases it through this output binding.
  loading = signal(true);
  params: AddressFilterParams = {
    source: 'homeCard', multiple: false, readonly: false, class: 'none',
    cols: '1', gutterSize: '8px', rowHeight: '76px',
    isShowCountry: true, isShowRegion: true, isShowDistrict: true, isShowLocality: true,
  };
  defaults: DefaultAddressParams = { countryId: null, regionId: null, districtId: null, localityId: null };
}

describe('AddressFilterComponent async hierarchy and loading', () => {
  let fixture: ComponentFixture<AsyncAddressHostComponent>;
  let host: AsyncAddressHostComponent;
  let component: AddressFilterComponent;
  let http: HttpTestingController;
  let handleError: jasmine.Spy<MessageWrapperService['handle']>;
  const url = `${environment.apiUrl}/api/toponyms/get-toponyms-list`;
  const countries: ToponymNamesList = [{ id: 1, name: 'Country A' }, { id: 2, name: 'Country B' }];
  const regionsA: ToponymNamesList = [{ id: 10, name: 'Region A' }];
  const regionsB: ToponymNamesList = [{ id: 20, name: 'Region B' }];
  const districtsA: ToponymNamesList = [{ id: 100, name: 'District A' }];
  const districtsB: ToponymNamesList = [{ id: 200, name: 'District B' }];
  const localitiesA: ToponymNamesList = [{ id: 1000, name: 'Locality A' }];
  const localitiesB: ToponymNamesList = [{ id: 2000, name: 'Locality B' }];
  const methods = {
    country: 'onCountrySelectionChange', region: 'onRegionSelectionChange',
    district: 'onDistrictSelectionChange', locality: 'onLocalitySelectionChange',
  } as const;
  const labels = { country: 'Country', region: 'Region', district: 'District', locality: 'Locality' } as const;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsyncAddressHostComponent], providers: provideComponentTesting(),
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    handleError = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    fixture = TestBed.createComponent(AsyncAddressHostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  function matchesRequest(type: 'countries' | 'regions' | 'districts' | 'localities', parentId: number | null) {
    return (request: TestRequest['request']) => request.url === url &&
      request.params.get('typeOfToponym') === type &&
      JSON.stringify(request.params.getAll('ids') ?? []) === JSON.stringify(parentId === null ? [] : [String(parentId)]);
  }

  function takeRequest(type: 'countries' | 'regions' | 'districts' | 'localities', parentId: number | null) {
    const request = http.expectOne(matchesRequest(type, parentId));
    expect(request.request.method).toBe('GET');
    return request;
  }

  function start(defaults: DefaultAddressParams = host.defaults) {
    host.defaults = defaults;
    fixture.detectChanges();
    component = host.address();
    return takeRequest('countries', null);
  }

  function open() {
    start().flush({ data: countries });
    expect(host.loading()).toBeFalse();
  }

  function select(level: ToponymType, id: number | null) {
    component.form.controls[level].setValue(id);
    component.handleToponymSelectionChange(methods[level], labels[level]);
  }

  function completeIfActive(request: TestRequest, data: ToponymNamesList) {
    // Cancellation and ignoring a stale response are both valid ways to protect current state.
    if (!request.cancelled) request.flush({ data });
  }

  function chooseBDescendants() {
    select('region', 20);
    takeRequest('districts', 20).flush({ data: districtsB });
    select('district', 200);
    takeRequest('localities', 200).flush({ data: localitiesB });
    select('locality', 2000);
  }

  function loadCurrentA() {
    open();
    select('country', 1);
    takeRequest('regions', 1).flush({ data: regionsA });
    select('region', 10);
    takeRequest('districts', 10).flush({ data: districtsA });
    select('district', 100);
    takeRequest('localities', 100).flush({ data: localitiesA });
    select('locality', 1000);
  }

  it('loads the default hierarchy in order and releases dialog loading after the final selection', () => {
    const initial = start({ countryId: 1, regionId: 10, districtId: 100, localityId: 1000 });
    expect(host.loading()).toBeTrue();
    initial.flush({ data: countries });
    takeRequest('regions', 1).flush({ data: regionsA });
    expect(host.loading()).toBeTrue();
    takeRequest('districts', 10).flush({ data: districtsA });
    expect(host.loading()).toBeTrue();
    takeRequest('localities', 100).flush({ data: localitiesA });

    expect(component.form.getRawValue()).toEqual({ country: 1, region: 10, district: 100, locality: 1000 });
    expect(component.toponymsList).toEqual({
      countriesList: countries, regionsList: regionsA, districtsList: districtsA, localitiesList: localitiesA,
    });
    expect(host.loading()).toBeFalse();
    expect(handleError).not.toHaveBeenCalled();
  });

  it('keeps country B options and selected descendants when country A responds late', () => {
    open();
    select('country', 1);
    const lateA = takeRequest('regions', 1);
    select('country', 2);
    takeRequest('regions', 2).flush({ data: regionsB });
    chooseBDescendants();
    completeIfActive(lateA, regionsA);

    expect(component.toponymsList).toEqual({
      countriesList: countries, regionsList: regionsB, districtsList: districtsB, localitiesList: localitiesB,
    });
    expect(component.form.getRawValue()).toEqual({ country: 2, region: 20, district: 200, locality: 2000 });
  });

  it('keeps region B district options and selections when region A responds late', () => {
    open();
    select('country', 1);
    takeRequest('regions', 1).flush({ data: [...regionsA, ...regionsB] });
    select('region', 10);
    const lateA = takeRequest('districts', 10);
    chooseBDescendants();
    completeIfActive(lateA, districtsA);

    expect(component.toponymsList.districtsList).toEqual(districtsB);
    expect(component.toponymsList.localitiesList).toEqual(localitiesB);
    expect(component.form.getRawValue()).toEqual({ country: 1, region: 20, district: 200, locality: 2000 });
  });

  it('keeps district B locality options and selection when district A responds late', () => {
    open();
    select('country', 1);
    takeRequest('regions', 1).flush({ data: regionsA });
    select('region', 10);
    takeRequest('districts', 10).flush({ data: [...districtsA, ...districtsB] });
    select('district', 100);
    const lateA = takeRequest('localities', 100);
    select('district', 200);
    takeRequest('localities', 200).flush({ data: localitiesB });
    select('locality', 2000);
    completeIfActive(lateA, localitiesA);

    expect(component.toponymsList.localitiesList).toEqual(localitiesB);
    expect(component.form.getRawValue()).toEqual({ country: 1, region: 10, district: 200, locality: 2000 });
  });

  it('does not repopulate or enable descendants after the country selection is cleared', () => {
    loadCurrentA();
    select('country', 2);
    const lateB = takeRequest('regions', 2);
    select('country', null);
    completeIfActive(lateB, regionsB);

    expect(component.form.getRawValue()).toEqual({ country: null, region: null, district: null, locality: null });
    expect(component.toponymsList.regionsList).toEqual([]);
    expect(component.toponymsList.districtsList).toEqual([]);
    expect(component.toponymsList.localitiesList).toEqual([]);
    for (const level of ['region', 'district', 'locality']) {
      expect(component.form.controls[level].disabled).toBeTrue();
    }
  });

  it('does not resume a superseded Home restore chain over a newer selected hierarchy', () => {
    open();
    component.onChangeMode('edit', { countryId: 1, regionId: 10, districtId: 100, localityId: 1000 });
    const lateRestore = takeRequest('regions', 1);
    select('country', 2);
    takeRequest('regions', 2).flush({ data: regionsB });
    chooseBDescendants();
    completeIfActive(lateRestore, regionsA);
    // Drain only requests that an obsolete chain still starts; a protected chain may start none.
    for (const request of http.match(matchesRequest('districts', 10))) completeIfActive(request, districtsA);
    for (const request of http.match(matchesRequest('localities', 100))) completeIfActive(request, localitiesA);

    expect(component.toponymsList).toEqual({
      countriesList: countries, regionsList: regionsB, districtsList: districtsB, localitiesList: localitiesB,
    });
    expect(component.form.getRawValue()).toEqual({ country: 2, region: 20, district: 200, locality: 2000 });
  });

  it('releases the owning dialog loading state when the initial countries request fails', () => {
    const initial = start();
    expect(host.loading()).toBeTrue();
    initial.flush({ message: 'Countries unavailable' }, { status: 500, statusText: 'Server Error' });

    expect(host.loading()).toBeFalse();
    expect(component.toponymsList.countriesList).toEqual([]);
    expect(component.form.controls['country'].enabled).toBeTrue();
    expect(handleError).toHaveBeenCalledWith(
      jasmine.any(HttpErrorResponse), jasmine.objectContaining({ source: 'AddressFilterComponent' }),
    );
  });

  it('clears obsolete descendants and reports a failed dependent load without retaining stale valid options', () => {
    loadCurrentA();
    select('country', 2);
    takeRequest('regions', 2).flush({ message: 'Regions unavailable' }, { status: 500, statusText: 'Server Error' });

    expect(host.loading()).toBeFalse();
    expect(component.form.getRawValue()).toEqual({ country: 2, region: null, district: null, locality: null });
    expect(component.toponymsList.regionsList).toEqual([]);
    expect(component.toponymsList.districtsList).toEqual([]);
    expect(component.toponymsList.localitiesList).toEqual([]);
    for (const level of ['region', 'district', 'locality']) {
      expect(component.form.controls[level].disabled).toBeTrue();
    }
    expect(handleError).toHaveBeenCalledWith(
      jasmine.any(HttpErrorResponse), jasmine.objectContaining({ source: 'AddressFilterComponent' }),
    );
  });
});
