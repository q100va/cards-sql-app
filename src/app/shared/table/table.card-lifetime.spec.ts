import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EMPTY, of } from 'rxjs';
import { TableComponent } from './table.component';
import { DetailsDialogComponent } from '../dialogs/details-dialogs/details-dialog/details-dialog.component';
import { PartnersListComponent } from '../../pages/partners-list/partners-list.component';
import { Partner } from '../../interfaces/advanced-model';
import { PartnerService } from '../../services/partner.service';
import { RoleService } from '../../services/role.service';
import { HomeService } from '../../services/home.service';
import { AddressService } from '../../services/address.service';
import { MessageWrapperService } from '../../services/message.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { lifetimePartner } from '../../testing/async-lifetime.spec-fixtures';
import { environment } from '../../../environments/environment';

describe('TableComponent owner-card request ownership', () => {
  let fixture: ComponentFixture<TableComponent<'partner'>>;
  let component: TableComponent<'partner'>;
  let http: HttpTestingController;
  let openDialog: jasmine.Spy<MatDialog['open']>;
  let handleError: jasmine.Spy<MessageWrapperService['handle']>;
  const url = `${environment.apiUrl}/api/partners/get-partner-by-id/`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent], providers: provideComponentTesting(),
    }).compileComponents();
    spyOn(TestBed.inject(PartnerService), 'getList').and.returnValue(of({ data: { list: [], length: 0 } }));
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(HomeService), 'getHomesPickList').and.returnValue(of([]));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    handleError = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    const ref = jasmine.createSpyObj<MatDialogRef<DetailsDialogComponent<Partner>>>('card', ['afterClosed']);
    ref.afterClosed.and.returnValue(EMPTY);
    openDialog = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue(ref);
    fixture = TestBed.createComponent(TableComponent<'partner'>);
    component = fixture.componentInstance;
    const config = new PartnersListComponent();
    fixture.componentRef.setInput('kind', 'partner');
    fixture.componentRef.setInput('params', config.params);
    fixture.componentRef.setInput('ownerDialogConfig', config.partnerDialogConfig);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function open(id: number) {
    component.onOpenOwnerCardClick(id);
    return http.expectOne(`${url}${id}`);
  }

  it('opens the requested card while its table owner is alive', () => {
    const owner = lifetimePartner();
    open(owner.id).flush({ data: owner });
    expect(openDialog).toHaveBeenCalledTimes(1);
    expect(openDialog.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({
      data: jasmine.objectContaining({ object: owner }),
    }));
    expect(handleError).not.toHaveBeenCalled();
  });

  it('does not open a card when its pending lookup completes after table destruction', () => {
    const request = open(10);
    fixture.destroy();
    if (!request.cancelled) request.flush({ data: lifetimePartner() });
    expect(openDialog).not.toHaveBeenCalled();
    expect(handleError).not.toHaveBeenCalled();
  });

  it('does not notify a card lookup error after table destruction', () => {
    const request = open(10);
    fixture.destroy();
    if (!request.cancelled) request.flush({}, { status: 500, statusText: 'Server Error' });
    expect(handleError).not.toHaveBeenCalled();
    expect(openDialog).not.toHaveBeenCalled();
  });

  it('does not open stale card A after the later card B intent has completed', () => {
    const first = open(10);
    const current = open(20);
    current.flush({ data: lifetimePartner(20) });
    expect(openDialog).toHaveBeenCalledTimes(1);
    expect(openDialog.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({
      data: jasmine.objectContaining({ object: lifetimePartner(20) }),
    }));
    if (!first.cancelled) first.flush({ data: lifetimePartner(10) });
    expect(openDialog).toHaveBeenCalledTimes(1);
    expect(openDialog.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({
      data: jasmine.objectContaining({ object: lifetimePartner(20) }),
    }));
  });
});
