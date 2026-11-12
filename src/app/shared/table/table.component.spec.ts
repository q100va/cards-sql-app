import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableComponent } from './table.component';
import type { Kind } from '../../interfaces/advanced-model';

describe('TableComponent', () => {
  let component: TableComponent<Kind>;
  let fixture: ComponentFixture<TableComponent<Kind>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
