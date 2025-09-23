import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { SignInComponent } from './sign-in.component';
import { AuthService } from '../../services/auth.service';
import { MessageWrapperService } from '../../services/message.service';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

describe('SignInComponent', () => {
  let fixture: ComponentFixture<SignInComponent>;
  let component: SignInComponent;

  // Spies
  let signInSvc: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let msgWrapper: jasmine.SpyObj<MessageWrapperService>;
  let i18n: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    signInSvc = jasmine.createSpyObj<AuthService>('AuthService', ['logIn']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    msgWrapper = jasmine.createSpyObj<MessageWrapperService>('MessageWrapperService', ['handle']);
    i18n = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    // make translate.instant return a predictable string
    i18n.instant.and.callFake((key: string, params?: any) =>
      params ? `t:${key}:${JSON.stringify(params)}` : `t:${key}`
    );

    await TestBed.configureTestingModule({
      imports: [SignInComponent], // standalone component
      providers: [
        { provide: AuthService, useValue: signInSvc },
        { provide: Router, useValue: router },
        { provide: MessageWrapperService, useValue: msgWrapper },
        { provide: TranslateService, useValue: i18n },
      ],
    })
      // keep tests independent from external HTML/Material DOM
      .overrideComponent(SignInComponent, {
        set: { template: `<form [formGroup]="form" (ngSubmit)="onSubmit()"></form>` },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates with initial state', () => {
    expect(component).toBeTruthy();
    expect(component.isLoad).toBeFalse();
    expect(component.form instanceof FormGroup).toBeTrue();
    expect(component.form.valid).toBeFalse();
    expect(component.errorMessage).toBeUndefined();
  });

  it('submits successfully: toggles loader, resets form, navigates to "/"', () => {
    // Arrange
    signInSvc.logIn.and.returnValue(of(void 0));
    component.form.setValue({ userName: 'alice', password: 'p@ss12345' });

    // Act
    component.onSubmit();

    // Assert
    expect(signInSvc.logIn).toHaveBeenCalledOnceWith('alice', 'p@ss12345');
    expect(component.isLoad).toBeFalse(); // back to false after success
    // after reset(), value becomes {userName: null, password: null} with typed controls
    expect(component.form.pristine).toBeTrue();
    expect(component.form.get('userName')?.value).toBeNull();
    expect(component.form.get('password')?.value).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(msgWrapper.handle).not.toHaveBeenCalled();
  });

  it('maps 401 to ERRORS.INVALID_AUTHORIZATION and logs via msgWrapper', () => {
    const err = new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
      error: { code: undefined },
    });
    signInSvc.logIn.and.returnValue(throwError(() => err));
    component.form.setValue({ userName: 'bob', password: 'bad' });

    component.onSubmit();

    expect(component.isLoad).toBeFalse();
    expect(i18n.instant).toHaveBeenCalledWith('ERRORS.INVALID_AUTHORIZATION', {});
    expect(component.errorMessage).toBe('t:ERRORS.INVALID_AUTHORIZATION:{}');
    expect(msgWrapper.handle).toHaveBeenCalledWith(err, { source: 'SignIn', stage: 'logIn' });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('maps 423 to ERRORS.ACCOUNT_LOCKED', () => {
    const err = new HttpErrorResponse({ status: 423, statusText: 'Locked' });
    signInSvc.logIn.and.returnValue(throwError(() => err));
    component.form.setValue({ userName: 'eve', password: 'x' });

    component.onSubmit();

    expect(i18n.instant).toHaveBeenCalledWith('ERRORS.ACCOUNT_LOCKED', {});
    expect(component.errorMessage).toBe('t:ERRORS.ACCOUNT_LOCKED:{}');
  });

  it('maps 429 to ERRORS.TOO_MANY_ATTEMPTS with retryAfterSec from body first', () => {
    const err = new HttpErrorResponse({
      status: 429,
      statusText: 'Too Many Requests',
      error: { data: { retryAfterSec: 75 } },
      headers: new HttpHeaders({ 'Retry-After': '120' }),
    });
    signInSvc.logIn.and.returnValue(throwError(() => err));
    component.form.setValue({ userName: 'throttle', password: 'x' });

    component.onSubmit();

    // prefers body.data.retryAfterSec (75) over header (120)
    expect(i18n.instant).toHaveBeenCalledWith('ERRORS.TOO_MANY_ATTEMPTS', { retryAfterSec: 75 });
    expect(component.errorMessage).toBe('t:ERRORS.TOO_MANY_ATTEMPTS:{"retryAfterSec":75}');
  });

  it('uses err.error.code when present', () => {
    const err = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: { code: 'CUSTOM.ERROR' },
    });
    signInSvc.logIn.and.returnValue(throwError(() => err));
    component.form.setValue({ userName: 'x', password: 'y' });

    component.onSubmit();

    expect(i18n.instant).toHaveBeenCalledWith('CUSTOM.ERROR', {});
    expect(component.errorMessage).toBe('t:CUSTOM.ERROR:{}');
  });
});
