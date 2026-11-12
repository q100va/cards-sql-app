import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { SeniorsListComponent } from '../seniors-list/seniors-list.component';
import { RoleService } from '../../services/role.service';
import { AddressService } from '../../services/address.service';
import { HomeService } from '../../services/home.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeniorDetailsComponent } from './senior-details.component';

describe('SeniorDetailsComponent', () => {
  let component: SeniorDetailsComponent;
  let fixture: ComponentFixture<SeniorDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeniorDetailsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(HomeService), 'getActiveHomesPickList').and.returnValue(of([]));
    fixture = TestBed.createComponent(SeniorDetailsComponent);
    component = fixture.componentInstance;
    const config = new SeniorsListComponent().seniorDialogConfig;
    fixture.componentRef.setInput('data', { ...config, operation: 'create', controlsDisable: false } satisfies typeof config);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
