import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { PartnerService } from '../../services/partner.service';
import { RoleService } from '../../services/role.service';
import { AddressService } from '../../services/address.service';
import { HomeService } from '../../services/home.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnersListComponent } from './partners-list.component';

describe('PartnersListComponent', () => {
  let component: PartnersListComponent;
  let fixture: ComponentFixture<PartnersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnersListComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(PartnerService), 'getList').and.returnValue(of({ data: { list: [], length: 0 } }));
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(HomeService), 'getHomesPickList').and.returnValue(of([]));
    fixture = TestBed.createComponent(PartnersListComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
