// src/app/pages/toponyms-lists/localities-list/localities-list.component.spec.ts
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { LocalitiesListComponent } from './localities-list.component';

/**
 * Lightweight stub for the heavy child (ToponymsListComponent).
 * We only need the selector and @Input names used by the template.
 */
@Component({
  selector: 'app-toponyms-list',
  standalone: true,
  template: '',
})
class ToponymsListStub {
  // Match real input names
  @Input() type!: any;
  @Input() toponymProps!: any;
}

describe('LocalitiesListComponent', () => {
  let fixture: ComponentFixture<LocalitiesListComponent>;
  let component: LocalitiesListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalitiesListComponent],
      providers: [
        // Provide minimal ActivatedRoute so constructor subscription works
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
      ],
    })
      // Replace real ToponymsListComponent with our stub to avoid TranslateService dependency
      .overrideComponent(LocalitiesListComponent, {
        set: { imports: [ToponymsListStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LocalitiesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sets type to "locality" by default (smoke)', () => {
    expect(component.type).toBe('locality');
  });

  it('passes [type] and [toponymProps] to the child in template (smoke)', () => {
    // If the template renders with the stub, bindings exist.
    const child = fixture.debugElement.children.find(
      (el) => el.componentInstance instanceof ToponymsListStub
    )?.componentInstance as ToponymsListStub | undefined;

    expect(child).toBeTruthy();
    expect(child!.type).toBe('locality');

    // Sanity check that a known prop key is forwarded
    expect(child!.toponymProps?.title).toBe('TOPONYM.TABLE_TITLE_LOCALITIES');

    // And visibility flags typical for localities page
    expect(child!.toponymProps?.isShowCountry).toBeTrue();
    expect(child!.toponymProps?.isShowRegion).toBeTrue();
    expect(child!.toponymProps?.isShowDistrict).toBeTrue();
    expect(child!.toponymProps?.isShowLocality).toBeTrue();
  });
});
