
import { Routes } from '@angular/router';

import { AuthLayoutComponent } from './shared/auth-layout/auth-layout.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { BaseLayoutComponent } from './shared/base-layout/base-layout.component';
import { authGuard } from './shared/guards/auth.guard';
import { RolesListComponent } from './pages/roles-list/roles-list.component';
import { ToponymsListComponent } from './shared/toponyms-list/toponyms-list.component';

export const routes: Routes = [
  {
    path: "",
    component: BaseLayoutComponent,
    canActivate: [authGuard],
    children: [
/*       {
        path: "",
        component: UsersListComponent,
        canActivate: [authGuard],
      },
      {
        path: "users",
        component: UsersListComponent,
        canActivate: [authGuard],
      },*/
      {
        path: "roles",
        component: RolesListComponent,
        canActivate: [authGuard],
      },
       {
        path: "toponyms",
        component: ToponymsListComponent,
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
