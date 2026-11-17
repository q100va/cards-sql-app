import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AddressService } from '../../../services/address.service';
import { AuthService } from '../../../services/auth.service';
import { MessageWrapperService } from '../../../services/message.service';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { AuthServiceHarness } from '../../../utils/auth-harness';
import { RegionsListComponent } from '../regions-list/regions-list.component';
import { ToponymsListComponent } from './toponyms-list.component';

describe('ToponymsListComponent loading ownership', () => {
  let fixture: ComponentFixture<ToponymsListComponent>;
  let component: ToponymsListComponent;
  let http: HttpTestingController;
  let handle: jasmine.Spy<MessageWrapperService['handle']>;
  const url = `${environment.apiUrl}/api/toponyms/toponyms`;

  beforeEach(async () => {
    const auth = new AuthServiceHarness();
    await TestBed.configureTestingModule({
      imports: [ToponymsListComponent],
      providers: [...provideComponentTesting(), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    handle = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ToponymsListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('type', 'region');
    fixture.componentRef.setInput('toponymProps', TestBed.runInInjectionContext(() => new RegionsListComponent().props));
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('keeps loading for pending B after cancelling A, then commits B and releases its loading', () => {
    const requestA = http.expectOne(request => request.url === url);
    expect(component.showSpinner()).toBeTrue();
    component.onChangedPage({ pageIndex: 1, pageSize: 10, length: 20 });
    fixture.detectChanges();
    TestBed.flushEffects();
    const requestB = http.expectOne(request => request.url === url);
    expect(requestA.cancelled).toBeTrue();
    expect(requestB.request.method).toBe('GET');
    expect(requestB.request.params.get('type')).toBe('region');
    expect(requestB.request.params.get('page')).toBe('1');
    expect(requestB.request.params.get('pageSize')).toBe('10');
    expect(requestB.request.params.get('sortBy')).toBe('name');
    expect(requestB.request.params.get('sortDir')).toBe('asc');
    expect(component.showSpinner()).toBeTrue();
    const newest = { id: 22, name: 'Newest Region', shortName: 'NR' };
    requestB.flush({ data: { toponyms: [newest], length: 21 } });
    expect(component.dataSource.data).toEqual([newest]);
    expect(component.length()).toBe(21);
    expect(component.pageIndex()).toBe(1);
    expect(component.showSpinner()).toBeFalse();
    expect(handle).not.toHaveBeenCalled();
  });

  it('settles a current error and keeps the query stream usable for a successful reload', () => {
    http.expectOne(request => request.url === url).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(component.showSpinner()).toBeFalse();
    expect(handle).toHaveBeenCalledOnceWith(jasmine.any(HttpErrorResponse), jasmine.objectContaining({
      source: 'ToponymList', stage: 'getToponyms', type: 'region',
    }));
    component.forceReload();
    fixture.detectChanges();
    TestBed.flushEffects();
    const reload = http.expectOne(request => request.url === url);
    expect(component.showSpinner()).toBeTrue();
    reload.flush({ data: { toponyms: [{ id: 23, name: 'Reloaded Region' }], length: 1 } });
    expect(component.dataSource.data.map(item => item.id)).toEqual([23]);
    expect(component.length()).toBe(1);
    expect(component.showSpinner()).toBeFalse();
    expect(handle).toHaveBeenCalledTimes(1);
  });
});
