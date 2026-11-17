import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { VolunteersListComponent } from '../volunteers-list/volunteers-list.component';
import { RoleService } from '../../services/role.service';
import { AddressService } from '../../services/address.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolunteerDetailsComponent } from './volunteer-details.component';

describe('VolunteerDetailsComponent', () => {
  let component: VolunteerDetailsComponent;
  let fixture: ComponentFixture<VolunteerDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteerDetailsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    fixture = TestBed.createComponent(VolunteerDetailsComponent);
    component = fixture.componentInstance;
    const config = new VolunteersListComponent().volunteerDialogConfig;
    fixture.componentRef.setInput('data', { ...config, operation: 'create', controlsDisable: false } satisfies typeof config);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
