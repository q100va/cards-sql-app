import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Kind } from '../../interfaces/advanced-model';
import { createEmptyGeneralFilter } from '../../interfaces/base-list';
import { HomesListComponent } from '../../pages/homes-list/homes-list.component';
import { AddressService } from '../../services/address.service';
import { PartnerService } from '../../services/partner.service';
import { RoleService } from '../../services/role.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { resetHome } from '../../testing/reset.spec-fixtures';
import { BaseListComponent } from '../base-list/base-list.component';
import { TableFilterComponent } from '../table-filter/table-filter.component';
import { TableComponent } from './table.component';

describe('TableComponent BaseList summary/query boundary', () => {
  let fixture: ComponentFixture<TableComponent<Kind>>;
  let component: TableComponent<Kind>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/api/homes/get-homes`;
  const response = { data: { list: [resetHome()], length: 12 } };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: ActivatedRoute, useValue: { queryParams: of({ countryId: '143', addressFilterString: 'Country' }) } satisfies Pick<ActivatedRoute, 'queryParams'> },
      ],
    }).compileComponents();
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(PartnerService), 'getPartnersPickList').and.returnValue(of([]));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.callFake((_ids, type) => of({
      data: type === 'countries' ? [{ id: 143, name: 'Country' }] : [],
    }));
    TestBed.inject(TranslateService).use('en');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function settle() {
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  }

  function start() {
    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    const config = new HomesListComponent();
    fixture.componentRef.setInput('kind', 'home');
    fixture.componentRef.setInput('params', config.params);
    fixture.componentRef.setInput('ownerDialogConfig', config.homeDialogConfig);
    settle();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.page).toEqual({ size: 5, number: 0 });
    request.flush(response);
    settle();
  }

  function baseList() {
    return fixture.debugElement.query(By.directive(BaseListComponent)).injector.get(BaseListComponent);
  }

  function tableFilter() {
    return fixture.debugElement.query(By.directive(TableFilterComponent)).injector.get(TableFilterComponent);
  }

  function nextPage() {
    component.paginator.nextPage();
    settle();
    const request = http.expectOne(url);
    expect(request.request.body.page).toEqual({ size: 5, number: 1 });
    request.flush(response);
    settle();
    expect(component.pageIndex()).toBe(1);
    expect(component.paginator.pageIndex).toBe(1);
  }

  function expectNoListRequests() {
    const requests = http.match(url);
    expect(requests.length).toBe(0);
    requests.forEach(request => request.flush(response));
  }

  it('deduplicates the identical query at page zero after a display-label invalidation', () => {
    start();
    const query = structuredClone(component.filterParameters());
    tableFilter().addressStringValue.emit('Updated Country label');
    settle();
    expect(component.filterParameters()).toEqual(query);
    expect(component.pageIndex()).toBe(0);
    expectNoListRequests();
  });

  it('keeps the current page and avoids HTTP work when only the displayed address label changes', () => {
    start();
    nextPage();
    const query = structuredClone(component.filterParameters());
    tableFilter().addressStringValue.emit('Updated Country label');
    settle();
    expect(component.filterParameters()).toEqual(query);
    expect(component.pageIndex()).toBe(1);
    expect(component.paginator.pageIndex).toBe(1);
    expectNoListRequests();
  });

  it('resets pagination once for a real filter change and does not repeat HTTP work for cached summary reads', () => {
    start();
    nextPage();
    tableFilter().filterValue.emit({ ...createEmptyGeneralFilter(), hasCoordination: true });
    settle();
    const request = http.expectOne(url);
    expect(request.request.body.page).toEqual({ size: 5, number: 0 });
    expect(request.request.body.filters.general.hasCoordination).toBeTrue();
    expect(component.pageIndex()).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
    request.flush(response);
    settle();

    const summary = baseList().filterString();
    expect(baseList().filterString()).toBe(summary);
    expect(baseList().filterString()).toBe(summary);
    settle();
    expectNoListRequests();
  });

  it('sends one startup request with the configured address and initial view filters', () => {
    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    const config = new HomesListComponent();
    fixture.componentRef.setInput('kind', 'home');
    fixture.componentRef.setInput('params', config.params);
    fixture.componentRef.setInput('ownerDialogConfig', config.homeDialogConfig);
    settle();

    const request = http.expectOne(url);
    expect(request.request.body.page).toEqual({ size: 5, number: 0 });
    expect(request.request.body.view.option).toBe('only-active');
    expect(request.request.body.filters.address).toEqual({ countries: [143] });
    request.flush(response);
    settle();
    expectNoListRequests();
  });
});
