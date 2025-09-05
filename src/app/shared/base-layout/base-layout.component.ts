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
import { LanguageService } from '../../services/language.service';
import { TranslateModule } from '@ngx-translate/core';

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
    TranslateModule,
  ],
  templateUrl: './base-layout.component.html',
  styleUrl: './base-layout.component.css',
})
export class BaseLayoutComponent {
  @ViewChild(Toast) toast!: Toast;
  private signInService = inject(SignInService);
  private cookieService = inject(CookieService);
  public langService = inject(LanguageService);
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
      new MenuItem('settings', 'MENU.PROFILE', '/users/user/profile')
    );
    this.menuItems.push(new MenuItem('verified_user', 'MENU.ROLES', '/roles'));
    this.menuItems.push(new MenuItem('badge', 'MENU.USERS', '/users'));
    this.menuItems.push(
      new MenuItem('map', 'MENU.TOPONYMS', '/toponyms', [
        new MenuItem('place', 'MENU.COUNTRIES', '/countries'),
        new MenuItem('corporate_fare', 'MENU.REGIONS', '/regions'),
        new MenuItem('home_work', 'MENU.DISTRICTS', '/districts'),
        new MenuItem('holiday_village', 'MENU.LOCALITIES', '/localities'),
      ])
    );
    this.menuItems.push(new MenuItem('policy', 'MENU.AUDIT', '/audit'));

    /*     this.menuItems.push(
      new MenuItem('map', 'Люди', '/toponyms', [
        new MenuItem('place', 'Сеньоры', '/countries'),
        new MenuItem('location_city', 'Координаторы', '/localities'),
      ])
    ); */
  }

  setLanguage(code: 'en' | 'ru') {
    this.langService.set(code);
  }
}
