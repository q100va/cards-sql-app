// src/app/pages/toponyms-lists/regions-list/regions-list.component.spec.ts
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { RegionsListComponent } from './regions-list.component';

/**
 * Lightweight stub for the child ToponymsListComponent.
 * We only need its @Input API for smoke/prop forwarding tests.
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

describe('RegionsListComponent', () => {
  let fixture: ComponentFixture<RegionsListComponent>;
  let component: RegionsListComponent;

  // Controlled stream for query params (simulates ActivatedRoute.queryParams)
  let qp$: Subject<Record<string, any>>;

  beforeEach(async () => {
    qp$ = new Subject();

    await TestBed.configureTestingModule({
      imports: [RegionsListComponent],
      providers: [
        // Provide a fake ActivatedRoute with controllable queryParams
        { provide: ActivatedRoute, useValue: { queryParams: qp$ } },
      ],
    })
      // Swap the real ToponymsListComponent for a tiny stub to avoid heavy deps
      .overrideComponent(RegionsListComponent, {
        set: { imports: [ToponymsListStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RegionsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sets type to "region" by default (smoke)', () => {
    expect(component.type).toBe('region');
  });

  it('passes [type] and [toponymProps] to the child (smoke)', () => {
    // If the stub child exists, inputs are bound
    const child = fixture.debugElement.children.find(
      (el) => el.componentInstance instanceof ToponymsListStub
    )?.componentInstance as ToponymsListStub | undefined;

    expect(child).toBeTruthy();
    expect(child!.type).toBe('region');

    // Sanity-check several forwarded props
    const props = child!.toponymProps;
    expect(props.title).toBe('TOPONYM.TABLE_TITLE_REGIONS');
    expect(props.filename).toBe('template-regions.xlsx');
    expect(props.isShowCountry).toBeTrue();
    expect(props.isShowRegion).toBeTrue();
    expect(props.isShowDistrict).toBeFalse();
    expect(props.isShowLocality).toBeFalse();
  });

  it('updates props.queryParams when non-empty queryParams arrive', () => {
    const incoming = {
      countryId: '143',
      regionId: '77',
      districtId: null,
      localityId: null,
      addressFilterString: 'Россия, Читинская',
    };
    // Component subscribes in the constructor; emit a non-empty object
    qp$.next(incoming);
    fixture.detectChanges();

    expect(component.props.queryParams).toEqual(incoming as any);
  });

  it('ignores empty queryParams objects', () => {
    const before = { ...component.props.queryParams };
    qp$.next({}); // empty map should be ignored by the guard
    fixture.detectChanges();

    expect(component.props.queryParams).toEqual(before);
  });
});
