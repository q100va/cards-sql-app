import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './shared/auth-layout/auth-layout.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { BaseLayoutComponent } from './shared/base-layout/base-layout.component';
import { authGuard } from './guards/auth.guard';
import { RolesListComponent } from './pages/roles-list/roles-list.component';
import { UsersListComponent } from './pages/users-list/users-list.component';
import { CountriesListComponent } from './pages/toponyms-lists/countries-list/countries-list.component';
import { RegionsListComponent } from './pages/toponyms-lists/regions-list/regions-list.component';
import { DistrictsListComponent } from './pages/toponyms-lists/districts-list/districts-list.component';
import { LocalitiesListComponent } from './pages/toponyms-lists/localities-list/localities-list.component';
import { AuditTableComponent } from './pages/audit-table/audit-table.component';

export const routes: Routes = [
  // Публичные маршруты (без гарда)
  {
    path: 'session',
    component: AuthLayoutComponent,
    children: [
      { path: 'sign-in', component: SignInComponent },//{ path: "404", component: NotFoundComponent, },
    ],
  },

  // Защищённая зона
  {
    path: '',
    component: BaseLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' }, // дефолт
      { path: 'users', component: UsersListComponent },
      { path: 'roles', component: RolesListComponent },
      { path: 'countries', component: CountriesListComponent },
      { path: 'regions', component: RegionsListComponent },
      { path: 'districts', component: DistrictsListComponent },
      { path: 'localities', component: LocalitiesListComponent },
      { path: 'audit', component: AuditTableComponent },
    ],
  },

  // Фоллбек
  { path: '**', redirectTo: '' },
];
