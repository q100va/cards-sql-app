import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './shared/auth-layout/auth-layout.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { BaseLayoutComponent } from './shared/base-layout/base-layout.component';
import { authGuard } from './guards/auth.guard';
import { RolesListComponent } from './pages/roles-list/roles-list.component';
import { UsersListComponent } from './pages/users-list/users-list.component';
import { PartnersListComponent } from './pages/partners-list/partners-list.component';
import { CountriesListComponent } from './pages/toponyms-lists/countries-list/countries-list.component';
import { RegionsListComponent } from './pages/toponyms-lists/regions-list/regions-list.component';
import { DistrictsListComponent } from './pages/toponyms-lists/districts-list/districts-list.component';
import { LocalitiesListComponent } from './pages/toponyms-lists/localities-list/localities-list.component';
import { AuditTableComponent } from './pages/audit-table/audit-table.component';
import { waitAuthReady } from './guards/auth-ready.guard';
import { requireAnyOp, requireOp } from './guards/route-perms.guard';
import { VolunteersListComponent } from './pages/volunteers-list/volunteers-list.component';
import { HomesListComponent } from './pages/homes-list/homes-list.component';
import { SeniorsListComponent } from './pages/seniors-list/seniors-list.component';
import { OccasionsListComponent } from './pages/occasions-list/occasions-list.component';
import { RecipientsListComponent } from './pages/recipients-list/recipients-list.component';
import { SeniorsBulkUpdateComponent } from './pages/seniors-bulk-update/seniors-bulk-update.component';
import { OrderCardComponent } from './pages/order-card/order-card/order-card.component';

export const routes: Routes = [
  // Публичные маршруты (без гарда)
  {
    path: 'session',
    component: AuthLayoutComponent,
    children: [
      { path: 'sign-in', component: SignInComponent }, //{ path: "404", component: NotFoundComponent, },
    ],
  },

  // Защищённая зона
  {
    path: '',
    component: BaseLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    canMatch: [waitAuthReady],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' }, // дефолт

      {
        path: 'orders/new-order/:typeId',
        canMatch: [
          requireAnyOp('ADD_NEW_ORDER'),
        ],
        component: OrderCardComponent,
      },
      {
        path: 'users',
        canMatch: [
          requireAnyOp('VIEW_FULL_USERS_LIST', 'VIEW_LIMITED_USERS_LIST'),
        ],
        component: UsersListComponent,
      },
      {
        path: 'partners',
        canMatch: [
          requireAnyOp('VIEW_FULL_PARTNERS_LIST', 'VIEW_LIMITED_PARTNERS_LIST'),
        ],
        component: PartnersListComponent,
      },
      {
        path: 'homes',
        canMatch: [
          requireAnyOp('VIEW_FULL_HOMES_LIST', 'VIEW_LIMITED_HOMES_LIST'),
        ],
        component: HomesListComponent,
      },
      {
        path: 'seniors',
        canMatch: [
          requireAnyOp('VIEW_FULL_SENIORS_LIST', 'VIEW_LIMITED_SENIORS_LIST'),
        ],
        component: SeniorsListComponent,
      },
      {
        path: 'seniors-bulk-upload',
        canMatch: [requireAnyOp('UPLOAD_LIST_OF_SENIORS')],
        component: SeniorsBulkUpdateComponent,
      },
      {
        path: 'volunteers',
        canMatch: [
          requireAnyOp(
            'VIEW_FULL_VOLUNTEERS_LIST',
            'VIEW_LIMITED_VOLUNTEERS_LIST',
          ),
        ],
        component: VolunteersListComponent,
      },
      {
        path: 'roles',
        canMatch: [requireOp('ALL_OPS_ROLES')],
        component: RolesListComponent,
      },
      {
        path: 'occasions',
        canMatch: [requireOp('ALL_OPS_OCCASIONS')],
        component: OccasionsListComponent,
      },
      {
        path: 'recipients/:occasionId',
        canMatch: [
          requireAnyOp(
            'VIEW_LIMITED_RECIPIENTS_LIST',
            'VIEW_FULL_RECIPIENTS_LIST',
          ),
        ],
        component: RecipientsListComponent,
      },
      {
        path: 'countries',
        canMatch: [
          requireAnyOp('VIEW_FULL_TOPONYMS_LIST', 'VIEW_LIMITED_TOPONYMS_LIST'),
        ],
        component: CountriesListComponent,
      },
      {
        path: 'regions',
        canMatch: [
          requireAnyOp('VIEW_FULL_TOPONYMS_LIST', 'VIEW_LIMITED_TOPONYMS_LIST'),
        ],
        component: RegionsListComponent,
      },
      {
        path: 'districts',
        canMatch: [
          requireAnyOp('VIEW_FULL_TOPONYMS_LIST', 'VIEW_LIMITED_TOPONYMS_LIST'),
        ],
        component: DistrictsListComponent,
      },
      {
        path: 'localities',
        canMatch: [
          requireAnyOp('VIEW_FULL_TOPONYMS_LIST', 'VIEW_LIMITED_TOPONYMS_LIST'),
        ],
        component: LocalitiesListComponent,
      },
      {
        path: 'audit',
        canMatch: [requireOp('VIEW_FULL_ROLES_LIST')], //TODO: create operations for audit
        component: AuditTableComponent,
      },
    ],
  },

  // Фоллбек
  { path: '**', redirectTo: '' },
];
