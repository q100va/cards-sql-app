import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { PartnersListComponent } from '../../pages/partners-list/partners-list.component';
import { PartnerService } from '../../services/partner.service';
import { HomeService } from '../../services/home.service';
import { RoleService } from '../../services/role.service';
import { AddressService } from '../../services/address.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableComponent } from './table.component';
import type { Kind } from '../../interfaces/advanced-model';

describe('TableComponent', () => {
  let component: TableComponent<Kind>;
  let fixture: ComponentFixture<TableComponent<Kind>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(PartnerService), 'getList').and.returnValue(of({ data: { list: [], length: 0 } }));
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(HomeService), 'getHomesPickList').and.returnValue(of([]));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    const host = new PartnersListComponent();
    fixture.componentRef.setInput('kind', 'partner');
    fixture.componentRef.setInput('params', host.params);
    fixture.componentRef.setInput('ownerDialogConfig', host.partnerDialogConfig);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
