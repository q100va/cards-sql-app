import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { environment } from '../../../environments/environment';
import { OccasionService } from '../../services/occasion.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { loadPublicTranslations } from '../../testing/public-translations.spec-fixtures';
import { OccasionsListComponent } from './occasions-list.component';

describe('OccasionsListComponent destructive clear confirmation', () => {
  let fixture: ComponentFixture<OccasionsListComponent>;
  let dialog: ComponentFixture<ConfirmDialog>;
  let http: HttpTestingController;
  let lookup: jasmine.Spy<OccasionService['getOccasions']>;
  let translate: TranslateService;
  const url = `${environment.apiUrl}/api/recipients/clear-list/`;
  const occasion = {
    id: 20, type: 'OCCASION.BIRTHDAY.NAME', date: null, monthNameKey: null,
    month: '5', year: 2026, amount: 2, status: 'OCCASION.STATUS.OPEN',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OccasionsListComponent, ConfirmDialog], providers: provideComponentTesting(),
    }).compileComponents();
    translate = await loadPublicTranslations();
    lookup = spyOn(TestBed.inject(OccasionService), 'getOccasions').and.returnValue(of({ data: {
      occasions: [occasion], options: { date: [], month: [], year: [], type: [], status: [] },
    } }));
    http = TestBed.inject(HttpTestingController);
    dialog = TestBed.createComponent(ConfirmDialog);
    dialog.detectChanges();
    fixture = TestBed.createComponent(OccasionsListComponent);
    fixture.detectChanges();
  });

  afterEach(fakeAsync(() => {
    dialog.componentInstance.close();
    dialog.detectChanges();
    flush();
    http.verify();
  }));

  function renderedDialog(): HTMLElement {
    const host = document.querySelector<HTMLElement>('[role="alertdialog"]');
    if (!host) throw new Error('Expected the rendered confirmation dialog');
    return host;
  }

  function dialogButton(label: string): HTMLButtonElement {
    const host = renderedDialog();
    const control = Array.from(host.querySelectorAll<HTMLButtonElement>('button'))
      .find(item => item.textContent?.trim() === label);
    if (!control) throw new Error(`Expected confirmation ${label} action`);
    return control;
  }

  for (const language of ['en', 'ru'] as const) {
    it(`explains the list removal in ${language}, rejects without a write, and preserves the accepted PATCH/reload`, fakeAsync(() => {
      translate.use(language);
      const component = fixture.componentInstance;
      const name = component.getOccasionName(20);
      const expected = language === 'en'
        ? `Clear the recipient list for '${name}'? All recipients will be removed from this list.`
        : `Очистить список получателей для «${name}»? Все получатели будут удалены из этого списка.`;
      lookup.calls.reset();
      component.onClearListClick(20);
      dialog.detectChanges();
      flush();
      const host = renderedDialog();
      expect(host.textContent).toContain(expected);
      expect(host.textContent).not.toContain('PRIME_CONFIRM.CLEAR_LIST_MESSAGE');
      http.expectNone(url);
      dialogButton(translate.instant('PRIME_CONFIRM.REJECT')).click();
      dialog.detectChanges();
      flush();
      http.expectNone(url);
      expect(lookup).not.toHaveBeenCalled();

      component.onClearListClick(20);
      dialog.detectChanges();
      flush();
      dialogButton(translate.instant('PRIME_CONFIRM.ACCEPT')).click();
      const clear = http.expectOne(url);
      expect(clear.request.method).toBe('PATCH');
      expect(clear.request.body).toEqual({ occasionId: 20 });
      clear.flush({ data: null, code: 'SUCCESS.DATA_DELETED' });
      expect(lookup).toHaveBeenCalledTimes(1);
      dialog.detectChanges();
      flush();
    }));
  }
});
