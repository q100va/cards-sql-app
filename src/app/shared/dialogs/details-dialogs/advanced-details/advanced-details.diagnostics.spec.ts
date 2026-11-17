import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ClientLogBatch } from '../../../../interfaces/client-log';
import { HomeDetailsComponent } from '../../../../pages/home-details/home-details.component';
import { HomesListComponent } from '../../../../pages/homes-list/homes-list.component';
import { PartnerDetailsComponent } from '../../../../pages/partner-details/partner-details.component';
import { PartnersListComponent } from '../../../../pages/partners-list/partners-list.component';
import { AddressService } from '../../../../services/address.service';
import { AuthService } from '../../../../services/auth.service';
import { ClientLoggerService } from '../../../../services/client-logger.service';
import { HomeService } from '../../../../services/home.service';
import { PartnerService } from '../../../../services/partner.service';
import { RoleService } from '../../../../services/role.service';
import { ClientLoggerTestHarness } from '../../../../testing/client-logger-test-harness';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { resetActor } from '../../../../testing/reset.spec-fixtures';

describe('AdvancedDetails error diagnostic privacy', () => {
  const sensitive = {
    name: 'SENSITIVE_NAME', address: 'SENSITIVE_ADDRESS',
    contact: 'SENSITIVE_CONTACT@example.com', note: 'SENSITIVE_NOTE',
  };
  let hooks: ClientLoggerTestHarness;
  let http: HttpTestingController;
  let logError: jasmine.Spy<ClientLoggerService['error']>;
  let toast: jasmine.Spy<MessageService['add']>;

  beforeEach(async () => {
    hooks = new ClientLoggerTestHarness();
    await TestBed.configureTestingModule({
      imports: [HomeDetailsComponent, PartnerDetailsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(HomeService), 'getPotentialHomesPickList').and.returnValue(of([]));
    spyOn(TestBed.inject(PartnerService), 'getActivePartnersPickList').and.returnValue(of([]));
    logError = spyOn(TestBed.inject(ClientLoggerService), 'error').and.callThrough();
    toast = spyOn(TestBed.inject(MessageService), 'add');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try { http.verify(); }
    finally {
      TestBed.resetTestingModule();
      hooks.restore();
    }
  });

  function expectSafeDiagnostic(stage: string, kind: string) {
    const calls = logError.calls.allArgs().filter(([, context]) => context?.['stage'] === stage);
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toEqual(jasmine.objectContaining({
      source: 'CreateOwnerDialog', stage, kind, code: 'ERRORS.INVALID_SCHEMA', isHttp: false,
    }));
    expect(calls[0][1]?.['owner']).toBeUndefined();
    hooks.flushInterval();
    const transport = http.expectOne(`${environment.apiUrl}/api/client-logs`);
    const batch = transport.request.body as ClientLogBatch;
    expect(batch.items.filter(item => item.context?.['stage'] === stage).length).toBe(1);
    const emitted = JSON.stringify({ calls: logError.calls.allArgs(), batch });
    for (const value of Object.values(sensitive)) expect(emitted).not.toContain(value);
    expect(toast).toHaveBeenCalledOnceWith({
      severity: 'error', summary: 'TOAST.ERROR', detail: 'ERRORS.INVALID_SCHEMA', sticky: true,
    });
    transport.flush(null, { status: 204, statusText: 'No Content' });
  }

  it('identifies a Partner duplicate-check validation failure without logging its draft or nested contacts', fakeAsync(() => {
    const fixture = TestBed.createComponent(PartnerDetailsComponent);
    const component = fixture.componentInstance;
    const config = new PartnersListComponent().partnerDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'create', controlsDisable: false,
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
    component.mainForm.patchValue({ firstName: sensitive.name, affiliation: 1, comment: sensitive.note });
    component.getFormArray('email').at(0).setValue(sensitive.contact);
    tick();
    component.onSaveClick('saveAndExit');
    const check = http.expectOne(`${environment.apiUrl}/api/partners/check-partner-data/`);
    expect(check.request.method).toBe('POST');
    expect(check.request.body.firstName).toBe(sensitive.name);
    expect(check.request.body.contacts.email).toEqual([sensitive.contact]);
    check.flush({ data: null });
    expect(component.showSpinner()).toBeFalse();
    expectSafeDiagnostic('checkOwnerData', 'partner');
    http.expectNone(`${environment.apiUrl}/api/partners/create-partner`);
  }));

  it('identifies a Home create validation failure without logging names, postal text, notes, or nested contacts', fakeAsync(() => {
    const fixture = TestBed.createComponent(HomeDetailsComponent);
    const component = fixture.componentInstance;
    const config = new HomesListComponent().homeDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'create', controlsDisable: false,
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
    component.mainForm.patchValue({
      homeName: sensitive.name, officialName: sensitive.name, postalName: sensitive.name,
      postalCode: '123456', postalAddressPart: sensitive.address, comment: sensitive.note,
    });
    component.getFormArray('email').at(0).setValue(sensitive.contact);
    component.addressFilter.set({ countries: [143], regions: [20], districts: [30], localities: [40] });
    tick();
    component.onSaveClick('saveAndExit');
    const create = http.expectOne(`${environment.apiUrl}/api/homes/create-home`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(jasmine.objectContaining({
      homeName: sensitive.name, postalAddressPart: sensitive.address, comment: sensitive.note,
      draftContacts: jasmine.objectContaining({ email: [sensitive.contact] }),
    }));
    create.flush({ data: null });
    expect(component.showSpinner()).toBeFalse();
    expectSafeDiagnostic('saveOwner', 'home');
  }));
});
