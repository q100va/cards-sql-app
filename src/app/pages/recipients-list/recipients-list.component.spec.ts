import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipientsListComponent } from './recipients-list.component';

describe('RecipientsListComponent', () => {
  let component: RecipientsListComponent;
  let fixture: ComponentFixture<RecipientsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipientsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipientsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
