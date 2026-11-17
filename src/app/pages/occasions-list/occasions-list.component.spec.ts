import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { OccasionService } from '../../services/occasion.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OccasionsListComponent } from './occasions-list.component';

describe('OccasionsListComponent', () => {
  let component: OccasionsListComponent;
  let fixture: ComponentFixture<OccasionsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OccasionsListComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(OccasionService), 'getOccasions').and.returnValue(of({
      data: { occasions: [], options: { date: [], month: [], year: [], type: [], status: [] } },
    }));
    fixture = TestBed.createComponent(OccasionsListComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
