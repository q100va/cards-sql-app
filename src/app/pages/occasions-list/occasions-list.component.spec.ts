import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OccasionsListComponent } from './occasions-list.component';

describe('OccasionsListComponent', () => {
  let component: OccasionsListComponent;
  let fixture: ComponentFixture<OccasionsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OccasionsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OccasionsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
