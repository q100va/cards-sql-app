import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CountriesListComponent } from './countries-list.component';

// --- Lightweight stub for the heavy child Standalone component.
// We keep the same selector and just expose the inputs we care about.

@Component({
  selector: 'app-toponyms-list',
  standalone: true,
  template: ''
})
class ToponymsListStubComponent {
  @Input() type!: any;
  @Input() toponymProps!: any;
}

describe('CountriesListComponent', () => {
  let fixture: ComponentFixture<CountriesListComponent>;
  let component: CountriesListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Import the SUT (standalone) + our stub instead of the real child
      imports: [CountriesListComponent, ToponymsListStubComponent],
    })
      // Replace the component's `imports` (it normally imports the real child)
      // with our stub to avoid pulling heavy dependencies.
      .overrideComponent(CountriesListComponent, {
        set: { imports: [ToponymsListStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CountriesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('passes [type] and [toponymProps] to the child (smoke)', () => {
    // Find the stub child in the rendered tree
    const childDE = fixture.debugElement.query(
      By.directive(ToponymsListStubComponent)
    );
    expect(childDE).toBeTruthy(); // child is present

    // Get stub instance to inspect incoming inputs
    const child = childDE.componentInstance as ToponymsListStubComponent;

    // Assert "type" is hard-coded to 'country' in the parent
    expect(child.type).toBe('country');

    // Basic sanity checks on a couple of fields to ensure the object is wired through
    expect(child.toponymProps).toBeTruthy();
    expect(child.toponymProps.displayedColumns).toEqual(['name', 'actions']);
    expect(child.toponymProps.dialogProps?.creationTitle)
      .toBe('TOPONYM.CREATION_TITLE_COUNTRY');

    // Check defaults that matter for Countries list behavior
    expect(child.toponymProps.isShowCountry).toBeTrue();
    expect(child.toponymProps.isShowRegion).toBeFalse();
    expect(child.toponymProps.isShowDistrict).toBeFalse();
    expect(child.toponymProps.isShowLocality).toBeFalse();
    expect(child.toponymProps.filename).toBe('template-countries.xlsx');
  });
});
