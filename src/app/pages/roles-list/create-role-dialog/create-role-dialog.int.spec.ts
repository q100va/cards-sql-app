import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { CreateRoleDialogComponent } from './create-role-dialog.component';
import { MessageWrapperService } from '../../../services/message.service';
import { environment } from '../../../../environments/environment';
import { ConfirmationService } from 'primeng/api';

class EmptyLoader implements TranslateLoader {
  getTranslation() {
    return of({});
  }
}

describe('CreateRoleDialogComponent (integration)', () => {
  let fixture: ComponentFixture<CreateRoleDialogComponent>;
  let comp: CreateRoleDialogComponent;
  let http: HttpTestingController;
  const BASE = `${environment.apiUrl}/api/roles`;

  const msgStub = jasmine.createSpyObj('MessageWrapperService', [
    'handle',
    'messageTap',
    'warn',
  ]);

  const dialogRefStub = jasmine.createSpyObj('MatDialogRef', ['close']);

  beforeEach(async () => {
    msgStub.messageTap.and.callFake(
      (_level?: any, _meta?: any, _transform?: any) => (src$: any) => src$
    );

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        // было: HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyLoader },
        }),
        CreateRoleDialogComponent,
      ],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        ConfirmationService,
        { provide: MessageWrapperService, useValue: msgStub },
        { provide: MatDialogRef, useValue: dialogRefStub },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { userId: 1, userName: 'Oxana' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateRoleDialogComponent);
    comp = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    dialogRefStub.close.calls.reset();
    msgStub.handle.calls.reset();
    msgStub.warn.calls.reset();
  });

  it('invalid form → warn and no requests', () => {
    comp.roleName.setValue(''); // invalid
    comp.roleDescription.setValue('abc'); // too short by zod (adjust if needed)
    comp.onCreateRoleClick();

    expect(msgStub.warn).toHaveBeenCalled();
    http.expectNone(`${BASE}/check-role-name/`);
    http.expectNone(`${BASE}/create-role`);
    expect(dialogRefStub.close).not.toHaveBeenCalled();
  });

  it('busy name → no create, dialog not closed', () => {
    comp.roleName.setValue('Admin');
    comp.roleDescription.setValue('Valid description');

    comp.onCreateRoleClick();

    http.expectOne(`${BASE}/check-role-name/Admin`).flush({ data: true });
    http.expectNone(`${BASE}/create-role`);

    expect(dialogRefStub.close).not.toHaveBeenCalled();
  });

  it('free name → creates and closes dialog with result', () => {
    comp.roleName.setValue('NewR');
    comp.roleDescription.setValue('Long enough');

    comp.onCreateRoleClick();

    http.expectOne(`${BASE}/check-role-name/NewR`).flush({ data: false });
    const post = http.expectOne(`${BASE}/create-role`);
    expect(post.request.body).toEqual({
      name: 'NewR',
      description: 'Long enough',
    });
    post.flush({ data: 'NewR' });

    expect(dialogRefStub.close).toHaveBeenCalledWith('NewR');
  });

  it('create error → handle() and keep dialog open', () => {
    comp.roleName.setValue('NewR2');
    comp.roleDescription.setValue('Long enough');

    comp.onCreateRoleClick();

    http.expectOne(`${BASE}/check-role-name/NewR2`).flush({ data: false });
    const post = http.expectOne(`${BASE}/create-role`);
    post.flush({ message: 'boom' }, { status: 500, statusText: 'ERR' });

    expect(msgStub.handle).toHaveBeenCalled();
    expect(dialogRefStub.close).not.toHaveBeenCalled();
  });

  it('trims values before sending', () => {
    comp.roleName.setValue(' roleX ');
    comp.roleDescription.setValue('descriptionYYY');
    comp.onCreateRoleClick();

    http.expectOne(`${BASE}/check-role-name/roleX`).flush({ data: false });
    const post = http.expectOne(`${BASE}/create-role`);
    expect(post.request.body).toEqual({
      name: 'roleX',
      description: 'descriptionYYY',
    });
    post.flush({ data: 'roleX' });

    expect(dialogRefStub.close).toHaveBeenCalledWith('roleX');
  });

  it('onCancelClick: accept in confirm → close(null)', () => {
    // Simulate PrimeNG ConfirmationService.confirm accept
    // Here we call method with a stub event and directly invoke accept via spyOnProperty, or simply call accept by providing a fake target.
    const btn = document.createElement('button');
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'currentTarget', { value: btn });

    // Monkey-patch confirmation service to auto-accept
    const confirmation = TestBed.inject<any>(ConfirmationService as any) as any;
    spyOn(confirmation, 'confirm').and.callFake((cfg: any) => cfg.accept?.());

    comp.onCancelClick(event as any);

    expect(dialogRefStub.close).toHaveBeenCalledWith(null);
  });
});
