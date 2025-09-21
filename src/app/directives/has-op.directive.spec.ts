// has-op.directive.spec.ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';

import { HasOpDirective } from './has-op.directive';
import { AuthService } from '../services/auth.service';

// ---- AuthService mock compatible with the directive ----
type Perm = { operation: string; access: boolean; disabled: boolean };

class AuthServiceMock {
  // the directive reacts to permissions$() via a signal effect
  permissions$ = signal<ReadonlyMap<string, Perm>>(new Map());

  has = (op: string) => !!this.permissions$().get(op)?.access;

  setPerms(list: Perm[]) {
    // always set a NEW Map so the signal notifies dependents
    const m = new Map<string, Perm>();
    for (const p of list) m.set(p.operation, p);
    this.permissions$.set(m);
  }

  clear() {
    this.permissions$.set(new Map());
  }
}

// ---- Host component for exercising the structural directive ----
@Component({
  standalone: true,
  imports: [CommonModule, HasOpDirective],
  template: `
    <ng-template #elseTpl>
      <span data-testid="else">ELSE</span>
    </ng-template>

    <div data-testid="content" *hasOp="params; else elseTpl">
      CONTENT
    </div>
  `,
})
class HostComponent {
  params: { codes: string[]; mode: 'any' | 'all' } = {
    codes: [],
    mode: 'any',
  };
}

describe('HasOpDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let authMock: AuthServiceMock;

  const queryContent = () =>
    fixture.debugElement.queryAll(By.css('[data-testid="content"]'));
  const queryElse = () =>
    fixture.debugElement.queryAll(By.css('[data-testid="else"]'));

  beforeEach(async () => {
    authMock = new AuthServiceMock();

    await TestBed.configureTestingModule({
      imports: [HostComponent], // standalone host already imports the directive
      providers: [{ provide: AuthService, useValue: authMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => {
    authMock.clear();
  });

  it('renders content when codes list is empty', () => {
    host.params = { codes: [], mode: 'any' };
    fixture.detectChanges();

    expect(queryContent().length).toBe(1);
    expect(queryElse().length).toBe(0);
  });

  describe('mode: any', () => {
    beforeEach(() => {
      host.params = { codes: ['A', 'B'], mode: 'any' };
      fixture.detectChanges(); // initial render (no permissions yet)
    });

    it('shows content if at least one code is allowed', () => {
      authMock.setPerms([{ operation: 'A', access: true, disabled: false }]);
      fixture.detectChanges();

      expect(queryContent().length).toBe(1);
      expect(queryElse().length).toBe(0);

      // switch to the other allowed code
      authMock.setPerms([{ operation: 'B', access: true, disabled: false }]);
      fixture.detectChanges();

      expect(queryContent().length).toBe(1);
      expect(queryElse().length).toBe(0);
    });

    it('hides content (shows else) when none of the codes is allowed', () => {
      authMock.setPerms([]); // no permissions
      fixture.detectChanges();

      expect(queryContent().length).toBe(0);
      expect(queryElse().length).toBe(1);
    });
  });

  describe('mode: all', () => {
    beforeEach(() => {
      host.params = { codes: ['A', 'B'], mode: 'all' };
      fixture.detectChanges();
    });

    it('shows content when all required codes are allowed', () => {
      authMock.setPerms([
        { operation: 'A', access: true, disabled: false },
        { operation: 'B', access: true, disabled: false },
      ]);
      fixture.detectChanges();

      expect(queryContent().length).toBe(1);
      expect(queryElse().length).toBe(0);
    });

    it('hides content when at least one required code is missing', () => {
      authMock.setPerms([{ operation: 'A', access: true, disabled: false }]); // B missing
      fixture.detectChanges();

      expect(queryContent().length).toBe(0);
      expect(queryElse().length).toBe(1);
    });
  });

  it('reactively switches between main and else template on permissions change', () => {
    host.params = { codes: ['X'], mode: 'all' };
    fixture.detectChanges();

    // no permissions -> else
    authMock.setPerms([]);
    fixture.detectChanges();
    expect(queryContent().length).toBe(0);
    expect(queryElse().length).toBe(1);

    // grant permission -> main content
    authMock.setPerms([{ operation: 'X', access: true, disabled: false }]);
    fixture.detectChanges();
    expect(queryContent().length).toBe(1);
    expect(queryElse().length).toBe(0);

    // revoke permission -> else again
    authMock.setPerms([]);
    fixture.detectChanges();
    expect(queryContent().length).toBe(0);
    expect(queryElse().length).toBe(1);
  });

  it('does not duplicate main content across multiple permission updates', () => {
    host.params = { codes: ['X'], mode: 'any' };
    fixture.detectChanges();

    for (let i = 0; i < 5; i++) {
      authMock.setPerms([{ operation: 'X', access: true, disabled: false }]);
      fixture.detectChanges();
      expect(queryContent().length).toBe(1);

      authMock.setPerms([]);
      fixture.detectChanges();
      expect(queryContent().length).toBe(0);
    }
  });
});
