import { OverlayContainer } from '@angular/cdk/overlay';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { LanguageService } from '../../services/language.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { loadPublicTranslations } from '../../testing/public-translations.spec-fixtures';
import { LANGUAGE_STORAGE_KEY } from '../../utils/language-preference';
import { BaseLayoutComponent } from './base-layout.component';

describe('BaseLayoutComponent home and menu semantics', () => {
  let fixture: ComponentFixture<BaseLayoutComponent>;
  let overlay: OverlayContainer;
  let savedLanguage: string | null;
  let savedDocumentLanguage: string;

  beforeEach(async () => {
    savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    savedDocumentLanguage = document.documentElement.lang;
    await TestBed.configureTestingModule({
      imports: [BaseLayoutComponent], providers: provideComponentTesting(),
    }).compileComponents();
    await loadPublicTranslations();
    TestBed.inject(LanguageService).set('en');
    fixture = TestBed.createComponent(BaseLayoutComponent);
    fixture.detectChanges();
    overlay = TestBed.inject(OverlayContainer);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    overlay.getContainerElement().replaceChildren();
    fixture.destroy();
    TestBed.resetTestingModule();
    if (savedLanguage === null) localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    else localStorage.setItem(LANGUAGE_STORAGE_KEY, savedLanguage);
    document.documentElement.lang = savedDocumentLanguage;
  });

  function button(name: string): HTMLButtonElement {
    const host: HTMLElement = fixture.nativeElement;
    const control = host.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
    expect(control).not.toBeNull();
    if (!control) throw new Error(`Expected named ${name} button`);
    expect(control.type).toBe('button');
    return control;
  }

  it('uses a native home link with a translated image alternative and retains its router destination', () => {
    const host: HTMLElement = fixture.nativeElement;
    const image = host.querySelector<HTMLImageElement>('img.nav-logo');
    expect(image?.alt).toBe('Home page');
    const link = image?.closest('a');
    expect(link).not.toBeNull();
    if (!link) throw new Error('Expected a native home link');
    expect(link.getAttribute('href')).toBe('/');
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    link.click();
    expect(navigate).toHaveBeenCalled();
    const destination = navigate.calls.mostRecent().args[0];
    expect(typeof destination === 'string' ? destination : TestBed.inject(Router).serializeUrl(destination)).toBe('/');
  });

  it('names the existing menu triggers and naturally updates their labels after language selection', fakeAsync(() => {
    const profile = button('User menu');
    profile.click();
    fixture.detectChanges();
    flush();
    expect(profile.getAttribute('aria-expanded')).toBe('true');
    expect(overlay.getContainerElement().querySelector('[role="menu"]')).not.toBeNull();
    for (const element of fixture.debugElement.queryAll(By.directive(MatMenuTrigger))) {
      element.injector.get(MatMenuTrigger).closeMenu();
    }
    fixture.detectChanges();
    flush();
    const language = button('Language');
    const setLanguage = spyOn(TestBed.inject(LanguageService), 'set').and.callThrough();
    language.click();
    fixture.detectChanges();
    flush();
    expect(language.getAttribute('aria-expanded')).toBe('true');
    const russian = Array.from(overlay.getContainerElement().querySelectorAll<HTMLButtonElement>('button'))
      .find(item => item.textContent?.trim() === 'Русский');
    if (!russian) throw new Error('Expected the existing Russian language option');
    russian.click();
    fixture.detectChanges();
    flush();
    expect(setLanguage).toHaveBeenCalledOnceWith('ru');
    expect(button('Меню пользователя')).toBe(profile);
    expect(button('Язык')).toBe(language);
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector<HTMLImageElement>('img.nav-logo')?.alt).toBe('Главная страница');
  }));
});
