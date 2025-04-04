
import { Routes } from '@angular/router';

import { AuthLayoutComponent } from './shared/auth-layout/auth-layout.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { BaseLayoutComponent } from './shared/base-layout/base-layout.component';
import { authGuard } from './shared/guards/auth.guard';
import { RolesListComponent } from './pages/roles-list/roles-list.component';
import { ToponymsListComponent } from './shared/toponyms-list/toponyms-list.component';
import { UsersListComponent } from './pages/users-list/users-list.component';
import { CountriesListComponent } from './pages/countries-list/countries-list.component';
import { LocalitiesListComponent } from './pages/localities-list/localities-list.component';
import { RegionsListComponent } from './pages/regions-list/regions-list.component';
import { DistrictsListComponent } from './pages/districts-list/districts-list.component';

export const routes: Routes = [
  {
    path: "",
    component: BaseLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: "",
        component: UsersListComponent,
        canActivate: [authGuard],
      },
      {
        path: "users",
        component: UsersListComponent,
        canActivate: [authGuard],
      },
      {
        path: "roles",
        component: RolesListComponent,
        canActivate: [authGuard],
      },
       {
        path: "countries",
        component: CountriesListComponent,
        canActivate: [authGuard],
      },
      {
        path: "regions",
        component: RegionsListComponent,
        canActivate: [authGuard],
      },
      {
        path: "districts",
        component: DistrictsListComponent,
        canActivate: [authGuard],
      },
      {
        path: "localities",
        component: LocalitiesListComponent,
        canActivate: [authGuard],
      },
   /*   {
        path: "addresses",
        component: UploadFileComponent,
        canActivate: [authGuard],
      }, */
    ]
  },
  {
    path: "session",
    component: AuthLayoutComponent,
    children: [
      {
        path: "sign-in",
        component: SignInComponent,
      },
/*       {
        path: "reset-password",
        component: ResetPasswordFormComponent,
      },
      {
        path: "404",
        component: NotFoundComponent,
      },
      {
        path: "500",
        component: ErrorComponent,
      }, */
    ],
  },
/*   {
    path: "**",
    redirectTo: "session/404",
  }, */
];
