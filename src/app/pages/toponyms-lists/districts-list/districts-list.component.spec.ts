// src/app/pages/toponyms-lists/districts-list/districts-list.component.spec.ts
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DistrictsListComponent } from './districts-list.component';

/**
 * Lightweight stub to avoid pulling real ToponymsListComponent and its deps
 * (Material, PrimeNG, TranslateService, etc.). We only need the @Input API.
 */
@Component({
  selector: 'app-toponyms-list',
  standalone: true,
  template: '',
})
class ToponymsListStub {
  @Input() type!: any;
  @Input() toponymProps!: any;
}

describe('DistrictsListComponent', () => {
  let fixture: ComponentFixture<DistrictsListComponent>;
  let component: DistrictsListComponent;

  // We'll control queryParams emissions in tests
  let qp$: Subject<Record<string, any>>;

  beforeEach(async () => {
    qp$ = new Subject();

    await TestBed.configureTestingModule({
      imports: [DistrictsListComponent],
      providers: [
        // Provide ActivatedRoute with controllable queryParams stream
        { provide: ActivatedRoute, useValue: { queryParams: qp$ } },
      ],
    })
      // Replace the real child with the stub so we don't need TranslateService etc.
      .overrideComponent(DistrictsListComponent, {
        set: { imports: [ToponymsListStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DistrictsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sets type to "district" by default (smoke)', () => {
    expect(component.type).toBe('district');
  });

  it('passes [type] and [toponymProps] to the child (smoke)', () => {
    // If the template renders with the stub, bindings exist
    const child = fixture.debugElement.children.find(
      (el) => el.componentInstance instanceof ToponymsListStub
    )?.componentInstance as ToponymsListStub | undefined;

    expect(child).toBeTruthy();
    expect(child!.type).toBe('district');

    // Sanity-check that a few props are forwarded
    expect(child!.toponymProps?.title).toBe('TOPONYM.TABLE_TITLE_DISTRICTS');
    expect(child!.toponymProps?.isShowCountry).toBeTrue();
    expect(child!.toponymProps?.isShowRegion).toBeTrue();
    expect(child!.toponymProps?.isShowDistrict).toBeTrue();
    expect(child!.toponymProps?.isShowLocality).toBeFalse();
    expect(child!.toponymProps?.filename).toBe('template-districts.xlsx');
  });

  it('updates props.queryParams when non-empty queryParams arrive', () => {
    // Emit non-empty params (component subscribes in constructor)
    const incoming = {
      countryId: '143',
      regionId: '77',
      districtId: null,
      localityId: null,
      addressFilterString: 'Россия, Регион',
    };
    qp$.next(incoming);
    fixture.detectChanges();

    // Expect component.props.queryParams to be replaced with incoming params
    expect(component.props.queryParams).toEqual(incoming as any);
  });

  it('ignores empty queryParams objects', () => {
    const before = { ...component.props.queryParams }; // snapshot before empty emission
    qp$.next({}); // empty → should be ignored by the "if(Object.keys().length != 0)" guard
    fixture.detectChanges();

    expect(component.props.queryParams).toEqual(before);
  });
});
