import { TestBed } from '@angular/core/testing';
import { TranslateService, TranslationObject } from '@ngx-translate/core';

export async function loadPublicTranslations(language: 'en' | 'ru' = 'en'): Promise<TranslateService> {
  const translate = TestBed.inject(TranslateService);
  for (const lang of ['en', 'ru']) {
    const module: unknown = await import('../../../public/i18n/' + lang + '.json');
    if (!module || typeof module !== 'object' || !('default' in module)) {
      throw new Error(`Unable to load ${lang} test translations`);
    }
    const dictionary: unknown = module.default;
    if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary)) {
      throw new Error(`Expected a ${lang} translation dictionary`);
    }
    translate.setTranslation(lang, dictionary as TranslationObject);
  }
  translate.use(language);
  return translate;
}
