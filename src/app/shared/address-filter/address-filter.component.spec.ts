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
    addressSpy = jasmine.createSpyObj('AddressService', ['getListOfToponyms']);
    msgSpy = jasmine.createSpyObj('MessageWrapperService', ['handle']);

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
  it('onChangeMode edit/view toggles controls enabling', () => {
    // initial state (region/district/locality disabled by design)
    expect(component.form.get('region')!.disabled).toBeTrue();
    expect(component.form.get('district')!.disabled).toBeTrue();
    expect(component.form.get('locality')!.disabled).toBeTrue();

    // edit mode enables all in list-mode
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
