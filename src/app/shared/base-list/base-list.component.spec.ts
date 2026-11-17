import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import type { FilterDraft, GeneralFilter } from '../../interfaces/base-list';
import { createEmptyGeneralFilter } from '../../interfaces/base-list';
import { HomesListComponent } from '../../pages/homes-list/homes-list.component';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { BaseListComponent } from './base-list.component';

describe('BaseListComponent summary and query publication', () => {
  let fixture: ComponentFixture<BaseListComponent>;
  let component: BaseListComponent;
  let snapshots: FilterDraft[];
  const viewLabel = 'HOME.VIEW_OPTIONS.ONLY_ACTIVE';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseListComponent], providers: provideComponentTesting(),
    })
      // Keep lifecycle/change detection, but remove the summary reader for this boundary test.
      .overrideComponent(BaseListComponent, { set: { template: '' } })
      .compileComponents();
    TestBed.inject(TranslateService).use('en');
    fixture = TestBed.createComponent(BaseListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('params', new HomesListComponent().params);
    snapshots = [];
    component.allFilterParametersChange.subscribe(snapshot => snapshots.push(snapshot));
    settle();
    component.filterString();
    snapshots.length = 0;
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function settle() {
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  }

  it('does not repeat query publication for cached summary reads', () => {
    expect(component.filterString()).toBe(viewLabel);
    expect(component.filterString()).toBe(viewLabel);
    expect(snapshots).toEqual([]);
  });

  it('publishes one changed filter snapshot after stabilization without requiring a summary read', () => {
    component.filterValue.set({ ...createEmptyGeneralFilter(), hasCoordination: true });
    settle();
    expect(snapshots).toEqual([component.allFilterParameters()]);
  });

  it('does not publish a query merely because an invalidated display-only summary is read', () => {
    const query = component.allFilterParameters();
    component.addressStringValue.set('Updated Country label');
    settle();
    expect(snapshots).toEqual([]);
    expect(component.filterString()).toBe(`${viewLabel}, Updated Country label`);
    expect(component.filterString()).toBe(`${viewLabel}, Updated Country label`);
    expect(component.allFilterParameters()).toEqual(query);
    expect(snapshots).toEqual([]);
  });

  it('keeps empty, single, multiple and cleared filter summaries and snapshots deterministic', () => {
    const empty: GeneralFilter = createEmptyGeneralFilter();
    const single: GeneralFilter = { ...createEmptyGeneralFilter(), hasCoordination: true };
    const multiple: GeneralFilter = { ...single, partners: [{ id: 20, name: 'Partner A' }] };
    for (const { filter, summary } of [
      { filter: empty, summary: viewLabel },
      { filter: single, summary: `${viewLabel}, NAV.FILTER.ONLY_WITH_COORDINATION` },
      { filter: multiple, summary: `${viewLabel}, NAV.FILTER.ONLY_WITH_COORDINATION, Partner A` },
      { filter: createEmptyGeneralFilter(), summary: viewLabel },
    ]) {
      component.filterValue.set(filter);
      expect(component.filterString()).toBe(summary);
      expect(component.filterString()).toBe(summary);
      expect(component.allFilterParameters()).toEqual({
        viewOption: 'only-active', viewHomeOption: 'only-active', searchValue: '', includeOutdated: false, exactMatch: false,
        filter, addressFilter: { countries: [], regions: [], districts: [], localities: [] },
        strongAddressFilter: false, strongContactFilter: false, strongDetailFilter: false,
      });
    }
  });

  it('publishes the cleared query once without reading the summary', () => {
    const emptyQuery = component.allFilterParameters();
    component.filterValue.set({ ...createEmptyGeneralFilter(), hasCoordination: true });
    settle();
    snapshots.length = 0;

    component.filterValue.set(createEmptyGeneralFilter());
    settle();
    expect(snapshots).toEqual([emptyQuery]);
    settle();
    expect(snapshots).toEqual([emptyQuery]);
  });
});
