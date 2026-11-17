import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { HomeService } from '../../services/home.service';
import { RoleService } from '../../services/role.service';
import { AddressService } from '../../services/address.service';
import { PartnerService } from '../../services/partner.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomesListComponent } from './homes-list.component';

describe('HomesListComponent', () => {
  let component: HomesListComponent;
  let fixture: ComponentFixture<HomesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomesListComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(HomeService), 'getList').and.returnValue(of({ data: { list: [], length: 0 } }));
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(PartnerService), 'getPartnersPickList').and.returnValue(of([]));
    fixture = TestBed.createComponent(HomesListComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
