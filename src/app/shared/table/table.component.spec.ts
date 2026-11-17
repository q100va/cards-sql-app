import { HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { PartnersListComponent } from '../../pages/partners-list/partners-list.component';
import { PartnerService } from '../../services/partner.service';
import { HomeService } from '../../services/home.service';
import { RoleService } from '../../services/role.service';
import { AddressService } from '../../services/address.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableComponent } from './table.component';
import type { Kind } from '../../interfaces/advanced-model';
import type { Home } from '../../interfaces/advanced-model';
import { By } from '@angular/platform-browser';
import { HomesListComponent } from '../../pages/homes-list/homes-list.component';
import { BaseListComponent } from '../base-list/base-list.component';
import { MessageWrapperService } from '../../services/message.service';
import { homeSchema } from '../../../../shared/schemas/home.schema';
import { environment } from '../../../environments/environment';
import { TranslateService } from '@ngx-translate/core';

describe('TableComponent', () => {
  let component: TableComponent<Kind>;
  let fixture: ComponentFixture<TableComponent<Kind>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(PartnerService), 'getList').and.returnValue(of({ data: { list: [], length: 0 } }));
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(HomeService), 'getHomesPickList').and.returnValue(of([]));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    const host = new PartnersListComponent();
    fixture.componentRef.setInput('kind', 'partner');
    fixture.componentRef.setInput('params', host.params);
    fixture.componentRef.setInput('ownerDialogConfig', host.partnerDialogConfig);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('TableComponent request loading and error fallback', () => {
  let fixture: ComponentFixture<TableComponent<Kind>>;
  let component: TableComponent<Kind>;
  let http: HttpTestingController;
  let handleError: jasmine.Spy<MessageWrapperService['handle']>;
  const url = `${environment.apiUrl}/api/homes/get-homes`;
  const rowA: Home = homeSchema.parse({
    id: 10, homeName: 'Page A Home', officialName: 'Page A Official Home',
    noAddress: false, specialHome: false, acceptableForSchool: true,
    isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
    dateOfStart: '2026-01-15T00:00:00.000Z', comment: null, infoNote: null,
    address: {
      id: 50, country: { id: 143, name: 'Country' }, region: { id: 20, shortName: 'Region' },
      district: { id: 30, shortName: 'District' }, locality: { id: 40, shortName: 'Locality' },
      postalCode: '123456', postalName: 'Home Recipient', postalAddressPart: 'Building 1',
      fullPostalAddress: '123456 Country, Region, District, Locality, Building 1', isRecoverable: true,
    },
    orderedContacts: {}, outdatedData: { contacts: {}, addresses: [], officialNames: [], coordinations: [] },
    coordinations: [], dateOfLastUpdate: null, isClose: false, dateOfClose: null,
  });
  const rowB: Home = { ...rowA, id: 20, homeName: 'Page B Home', officialName: 'Page B Official Home' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent], providers: provideComponentTesting(),
    }).compileComponents();
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(PartnerService), 'getPartnersPickList').and.returnValue(of([]));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    handleError = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    TestBed.inject(TranslateService).use('en');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function updateView() {
    TestBed.flushEffects();
    fixture.detectChanges();
  }

  function takePage(page: number) {
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.page).toEqual({ size: 5, number: page });
    return request;
  }

  function start() {
    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    const config = new HomesListComponent();
    fixture.componentRef.setInput('kind', 'home');
    fixture.componentRef.setInput('params', config.params);
    fixture.componentRef.setInput('ownerDialogConfig', config.homeDialogConfig);
    fixture.detectChanges();
    updateView();
    return takePage(0);
  }

  function requestPage(page: number) {
    component.onChangedPage({
      pageIndex: page, pageSize: 5, previousPageIndex: component.pageIndex(), length: component.length(),
    });
    updateView();
    return takePage(page);
  }

  function baseList(): BaseListComponent {
    return fixture.debugElement.query(By.directive(BaseListComponent)).injector.get(BaseListComponent);
  }

  function expectRows(rows: Home[], length: number) {
    updateView();
    expect(component.owners).toEqual(rows);
    expect(component.dataSource.data).toEqual(rows);
    expect(component.dataSource.filteredData).toEqual(rows);
    expect(component.length()).toBe(length);
    expect(component.paginator.length).toBe(length);
    const element: HTMLElement = fixture.nativeElement;
    expect(Array.from(element.querySelectorAll('td.mat-column-homeName'), cell => cell.textContent?.trim()))
      .toEqual(rows.map(row => row.homeName));
    if (!rows.length) {
      expect(element.querySelector('tr.mat-row')?.textContent ?? '').toContain('TABLE.NO_DATA_FOR_QUERY');
    }
  }

  it('keeps loading owned by pending page B when switchMap cancels page A, then displays B', () => {
    start().flush({ data: { list: [rowA], length: 12 } });
    expectRows([rowA], 12);
    const requestA = requestPage(1);
    expect(component.loading()).toBeTrue();
    expect(baseList().showSpinner()).toBeTrue();
    const requestB = requestPage(2);

    expect(requestA.cancelled).toBeTrue();
    expect(requestB.cancelled).toBeFalse();
    expect(component.loading()).toBeTrue();
    expect(baseList().showSpinner()).toBeTrue();
    requestB.flush({ data: { list: [rowB], length: 12 } });
    expectRows([rowB], 12);
    expect(component.loading()).toBeFalse();
    expect(baseList().showSpinner()).toBeFalse();
    expect(handleError).not.toHaveBeenCalled();
  });

  it('applies a successful empty page through the normal row/count and empty-state update path', () => {
    start().flush({ data: { list: [rowA], length: 12 } });
    expectRows([rowA], 12);
    const requestB = requestPage(1);
    expect(component.loading()).toBeTrue();
    requestB.flush({ data: { list: [], length: 0 } });

    expectRows([], 0);
    expect(component.loading()).toBeFalse();
    expect(baseList().showSpinner()).toBeFalse();
    expect(handleError).not.toHaveBeenCalled();
  });

  it('applies the failed current page fallback to rows/count and empty state, then accepts a later request', () => {
    start().flush({ data: { list: [rowA], length: 12 } });
    expectRows([rowA], 12);
    const requestB = requestPage(1);
    expect(component.loading()).toBeTrue();
    expect(baseList().showSpinner()).toBeTrue();
    requestB.flush({ message: 'Homes unavailable' }, { status: 500, statusText: 'Server Error' });

    expectRows([], 0);
    expect(component.loading()).toBeFalse();
    expect(baseList().showSpinner()).toBeFalse();
    expect(handleError).toHaveBeenCalledWith(
      jasmine.any(HttpErrorResponse), jasmine.objectContaining({ source: 'home-list', stage: 'getList' }),
    );

    const requestC = requestPage(0);
    expect(component.loading()).toBeTrue();
    requestC.flush({ data: { list: [rowB], length: 7 } });
    expectRows([rowB], 7);
    expect(component.loading()).toBeFalse();
    expect(baseList().showSpinner()).toBeFalse();
  });
});
