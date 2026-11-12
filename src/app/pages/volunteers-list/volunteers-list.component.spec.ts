import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { VolunteerService } from '../../services/volunteer.service';
import { RoleService } from '../../services/role.service';
import { AddressService } from '../../services/address.service';
import { UserService } from '../../services/user.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolunteersListComponent } from './volunteers-list.component';

describe('VolunteersListComponent', () => {
  let component: VolunteersListComponent;
  let fixture: ComponentFixture<VolunteersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteersListComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(VolunteerService), 'getList').and.returnValue(of({ data: { list: [], length: 0 } }));
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(UserService), 'getUsersPickList').and.returnValue(of([]));
    fixture = TestBed.createComponent(VolunteersListComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
