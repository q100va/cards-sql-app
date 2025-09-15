// src/app/shared/base-layout/base-layout.component.ts
import { Component, computed, inject } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';

import { MenuItem } from './menu-item';
import { SignInService } from '../../services/sign-in.service';
import { LanguageService } from '../../services/language.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { IdleService } from '../../services/idle.service';
import { interval, Subscription, takeWhile } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { AuthUser } from '@shared/schemas/auth.schema';

@Component({
  selector: 'app-base-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,

    // Material
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,

    // PrimeNG
    ConfirmDialogModule,
    ToastModule,
    ButtonModule,

    // i18n
    TranslateModule,
  ],
  templateUrl: './base-layout.component.html',
  styleUrl: './base-layout.component.css',
})
export class BaseLayoutComponent {
  private readonly signIn = inject(SignInService);
  readonly lang = inject(LanguageService);
  private confirmationService = inject(ConfirmationService);
  countdown = 60;
  private idleSub?: Subscription;

  // Делаем IdleService публичным, чтобы в шаблоне читать idle.countdown$
  readonly idle = inject(IdleService);

  readonly year: number = new Date().getFullYear();

  // Текущий пользователь
  readonly user = toSignal<AuthUser | null>(this.signIn.currentUser$, {
    initialValue: null,
  });
  readonly name = computed(() => {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}` : '';
  });
  readonly userName = computed(() => this.user()?.userName ?? '');

  menuItems: MenuItem[] = [];

  ngOnInit(): void {
    this.populateMenuItems();
  }

  ngOnDestroy(): void {
    this.idle.stop();
  }

  signOut(): void {
    this.signIn.logout().subscribe();
  }

  setLanguage(code: 'en' | 'ru') {
    this.lang.set(code);
  }

  private populateMenuItems() {
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
  }
}
