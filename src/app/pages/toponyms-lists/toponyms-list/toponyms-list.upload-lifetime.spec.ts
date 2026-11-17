import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToponymsListComponent } from './toponyms-list.component';
import { RegionsListComponent } from '../regions-list/regions-list.component';
import { AddressService } from '../../../services/address.service';
import { AuthService } from '../../../services/auth.service';
import { MessageWrapperService } from '../../../services/message.service';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { AuthServiceHarness } from '../../../utils/auth-harness';
import { environment } from '../../../../environments/environment';

describe('ToponymsListComponent upload HTTP lifetime', () => {
  let fixture: ComponentFixture<ToponymsListComponent>;
  let http: HttpTestingController;
  let reload: jasmine.Spy<ToponymsListComponent['forceReload']>;
  let handleError: jasmine.Spy<MessageWrapperService['handle']>;
  const url = `${environment.apiUrl}/api/toponyms/populate-toponyms`;

  beforeEach(async () => {
    const auth = new AuthServiceHarness();
    auth.setUser({ id: 7, roleId: 1 });
    await TestBed.configureTestingModule({
      imports: [ToponymsListComponent],
      providers: [...provideComponentTesting(), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    spyOn(TestBed.inject(AddressService), 'getToponyms').and.returnValue(of({ data: { toponyms: [], length: 0 } }));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    handleError = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    fixture = TestBed.createComponent(ToponymsListComponent);
    fixture.componentRef.setInput('type', 'region');
    fixture.componentRef.setInput('toponymProps', TestBed.runInInjectionContext(() => new RegionsListComponent().props));
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    reload = spyOn(fixture.componentInstance, 'forceReload').and.callThrough();
  });

  afterEach(() => http.verify());

  function upload() {
    fixture.componentInstance.saveData([{ name: 'Region', shortName: 'R', country: 'Country' }]);
    const request = http.expectOne(url);
    expect(request.request.body).toEqual({
      type: 'region', data: [{ name: 'Region', shortName: 'R', country: 'Country' }],
    });
    return request;
  }

  it('cancels a pending upload before a late success can refresh a destroyed list', () => {
    const request = upload();
    fixture.destroy();
    expect(request.cancelled).toBeTrue();
    expect(reload).not.toHaveBeenCalled();
    expect(handleError).not.toHaveBeenCalled();
  });

  it('does not notify an upload failure after the owning list is destroyed', () => {
    const request = upload();
    fixture.destroy();
    if (!request.cancelled) request.flush({}, { status: 500, statusText: 'Server Error' });
    expect(handleError).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
