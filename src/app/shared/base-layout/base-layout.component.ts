import { Component, inject, ViewChild } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Toast, ToastModule } from 'primeng/toast';
import { MenuItem } from './menu-item';
import { SignInService } from '../../services/sign-in.service';

@Component({
  selector: 'app-base-layout',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    RouterOutlet,
    RouterModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  templateUrl: './base-layout.component.html',
  styleUrl: './base-layout.component.css',
})
export class BaseLayoutComponent {
  @ViewChild(Toast) toast!: Toast;
  private signInService = inject(SignInService);
  private cookieService = inject(CookieService);
  // private roleService = inject(RoleService);
  year: number = Date.now();
  name: string | null = sessionStorage.getItem('name');
  userName: string = this.cookieService.get('session_user');
  menuItems: MenuItem[] = [];

  constructor() {}

  ngOnInit(): void {
    this.populateMenuItems();

    /*     this.roleService.findUserRole(this.cookieService.get("session_user")).subscribe((res) => {
      this.userRole = res["data"];
      //console.log(this.userRole);
      this.isAdmin = this.userRole === "admin" ;
      this.isManager = this.userRole === "manager";
      this.isDobroru = this.userRole === "dobroru";
    });*/
  }

  /*   clear(msg: any) {
    this.toast.clear(msg);
  } */

  signOut() {
    this.cookieService.deleteAll();
    this.signInService.logout();
  }

  populateMenuItems() {
    this.menuItems.push(
      new MenuItem('settings', 'Профайл', '/users/user/profile')
    );
    this.menuItems.push(new MenuItem('verified_user', 'Роли', '/roles'));
    this.menuItems.push(new MenuItem('badge', 'Пользователи', '/users'));
    this.menuItems.push(
      new MenuItem('map', 'Топонимы', '/toponyms', [
        new MenuItem('place', 'Страны', '/countries'),
        new MenuItem('corporate_fare', 'Регионы', '/regions'),
        new MenuItem('home_work', 'Р-ны/округа', '/districts'),
        new MenuItem('holiday_village', 'Насел. пункты', '/localities'),
      ])
    );
    this.menuItems.push(new MenuItem('policy', 'Аудит', '/audit'));

    /*     this.menuItems.push(
      new MenuItem('map', 'Люди', '/toponyms', [
        new MenuItem('place', 'Сеньоры', '/countries'),
        new MenuItem('location_city', 'Координаторы', '/localities'),
      ])
    ); */
  }
}
