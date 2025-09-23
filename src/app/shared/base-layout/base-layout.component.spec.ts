// src/app/shared/base-layout/base-layout.component.spec.ts
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of, BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
/* import {
  provideHttpClient,
} from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
 */
import { BaseLayoutComponent } from './base-layout.component';
import { AuthService } from '../../services/auth.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { IdleService } from 'src/app/services/idle.service';
import { LanguageService } from 'src/app/services/language.service';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';

// ---- Minimal translate loader (no real i18n needed)
class EmptyLoader implements TranslateLoader {
  getTranslation() {
    return of({});
  }
}

// ---- IdleService stub (template references .countdown$ and methods)
class IdleStub {
  countdown$ = of(0);
  start() {}
  stop() {}
  confirmAccept() {}
  confirmReject() {}
}

// ---- AuthService stub with Angular signal, to trigger HasOpDirective effects
type Perm = { operation: string; access: boolean; disabled: boolean };
class AuthStub {
  // matches AuthService API surface used by component/directives
  private _permsSig = signal<ReadonlyMap<string, Perm>>(new Map());
  permissions$ = this._permsSig; // signal<ReadonlyMap<...>>
  authReady$ = new BehaviorSubject<boolean>(true);
  permsReady$ = new BehaviorSubject<boolean>(false);
  get authReadyOnce$() {
    return this.authReady$.asObservable();
  }
  get permsReadyOnce$() {
    return this.permsReady$.asObservable();
  }
  currentUser$ = new BehaviorSubject<any>({
    id: 1,
    firstName: 'A',
    lastName: 'B',
    userName: 'tester',
  }).asObservable();

  setPerms(list: Perm[]) {
    const m = new Map(list.map((p) => [p.operation, p]));
    this._permsSig.set(m); // triggers HasOpDirective.effect()
  }
  setPermsReady(v: boolean) {
    this.permsReady$.next(v);
  }
  has(op: string) {
    return !!this._permsSig().get(op)?.access;
  }
}
const langStub = { current: 'ru', set: jasmine.createSpy('set') };

describe('BaseLayoutComponent — menu & permissions', () => {
  let fixture: ComponentFixture<BaseLayoutComponent>;
  let component: BaseLayoutComponent;
  let auth: AuthStub;
  let overlay: OverlayContainer;

  function openProfileMenu() {
    const trigger: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[data-cy="profileMenu"]');
    expect(trigger).withContext('menu trigger not found').toBeTruthy();
    trigger!.click();
    fixture.detectChanges();
  }

  function queryMenuItem(dataCy: string): HTMLElement | null {
    // Angular Material renders menus into CDK overlay container
    const root = overlay.getContainerElement();
    return root.querySelector(`[data-cy="${dataCy}"]`);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Standalone component
        BaseLayoutComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyLoader },
        }),
      ],
      providers: [
        // provideHttpClient(),
        // provideHttpClientTesting(),
        provideRouter([], withDisabledInitialNavigation()),

        { provide: LanguageService, useValue: langStub },
        { provide: IdleService, useClass: IdleStub },
        { provide: AuthService, useClass: AuthStub },
        { provide: MessageService, useFactory: () => new MessageService() },
        {
          provide: ConfirmationService,
          useFactory: () => new ConfirmationService(),
        },
      ],
    }).compileComponents();

    overlay = TestBed.inject(OverlayContainer);
    auth = TestBed.inject(AuthService) as unknown as AuthStub;

    fixture = TestBed.createComponent(BaseLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

afterEach(() => {
  overlay?.getContainerElement()?.replaceChildren(); // очистка без присваивания
  fixture?.destroy();
});

  it('hides restricted items before permissions are ready', fakeAsync(() => {
    // initial: permsReady=false, no permissions
    openProfileMenu();
    expect(queryMenuItem('nav-roles')).toBeNull(); // requires ALL_OPS_ROLES
    expect(queryMenuItem('nav-users')).toBeNull(); // requires VIEW_*_USERS_LIST
  }));

  it('shows items after permissions arrive (ALL_OPS_ROLES & VIEW_*_USERS_LIST)', fakeAsync(() => {
    // simulate permissions load
    auth.setPerms([
      { operation: 'ALL_OPS_ROLES', access: true, disabled: false },
      { operation: 'VIEW_FULL_USERS_LIST', access: true, disabled: false },
    ]);
    auth.setPermsReady(true);
    fixture.detectChanges();
    tick(); // allow any microtasks

    openProfileMenu();
    expect(queryMenuItem('nav-roles'))
      .withContext('Roles item should be visible')
      .not.toBeNull();
    expect(queryMenuItem('nav-users'))
      .withContext('Users item should be visible')
      .not.toBeNull();
  }));

  it('menu updates when permissions change (revoke ALL_OPS_ROLES)', fakeAsync(() => {
    // grant first
    auth.setPerms([
      { operation: 'ALL_OPS_ROLES', access: true, disabled: false },
      { operation: 'VIEW_FULL_USERS_LIST', access: true, disabled: false },
    ]);
    auth.setPermsReady(true);
    fixture.detectChanges();
    tick();

    openProfileMenu();
    expect(queryMenuItem('nav-roles')).not.toBeNull();

    // revoke admin permission — keep users list
    auth.setPerms([
      { operation: 'VIEW_FULL_USERS_LIST', access: true, disabled: false },
    ]);
    fixture.detectChanges();
    tick();

    // reopen to ensure fresh DOM (close by clicking outside)
    document.body.click();
    fixture.detectChanges();
    openProfileMenu();

    expect(queryMenuItem('nav-roles')).toBeNull();
    expect(queryMenuItem('nav-users')).not.toBeNull();
  }));
});
