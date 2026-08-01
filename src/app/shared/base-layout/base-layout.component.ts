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

import { Menu } from './menu-item';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { IdleService } from '../../services/idle.service';
import { AuthUser } from '../../../../shared/schemas/auth.schema';
import { HasOpDirective } from '../../directives/has-op.directive';

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

    HasOpDirective,
  ],
  templateUrl: './base-layout.component.html',
  styleUrl: './base-layout.component.css',
})
export class BaseLayoutComponent {
  readonly auth = inject(AuthService);
  readonly lang = inject(LanguageService);
  countdown = 60;

  readonly idle = inject(IdleService);
  readonly year: number = new Date().getFullYear();

  // Текущий пользователь
  readonly user = toSignal<AuthUser | null>(this.auth.currentUser$, {
    initialValue: null,
  });
  readonly name = computed(() => {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}` : '';
  });
  readonly userName = computed(() => this.user()?.userName ?? '');
  readonly userId = computed(() => this.user()?.id ?? '');

  menu: Menu = [
    {
      params: {
        codes: ['ALL_OPS_ROLES'],
        mode: 'all',
      },
      dataCy: 'nav-roles',
      icon: 'verified_user',
      text: 'MENU.ROLES',
      link: '/roles',
    },
    {
      params: {
        codes: ['ALL_OPS_OCCASIONS'],
        mode: 'all',
      },
      dataCy: 'nav-occasions',
      icon: 'cake',
      text: 'MENU.OCCASIONS',
      link: '/occasions',
    },
    {
      params: {
        codes: ['VIEW_LIMITED_USERS_LIST', 'VIEW_FULL_USERS_LIST'],
        mode: 'any',
      },
      dataCy: 'nav-users',
      icon: 'badge',
      text: 'MENU.USERS',
      link: '/users',
    },
    {
      params: {
        codes: ['VIEW_LIMITED_VOLUNTEERS_LIST', 'VIEW_FULL_VOLUNTEERS_LIST'],
        mode: 'any',
      },
      dataCy: 'nav-volunteers',
      icon: 'groups',
      text: 'MENU.VOLUNTEERS',
      link: '/volunteers',
    },
    {
      params: {
        codes: ['VIEW_LIMITED_HOMES_LIST', 'VIEW_FULL_HOMES_LIST'],
        mode: 'any',
      },
      dataCy: 'nav-homes',
      icon: 'house',
      text: 'MENU.HOMES',
      link: '/homes',
    },
    {
      params: {
        codes: ['VIEW_LIMITED_SENIORS_LIST', 'VIEW_FULL_SENIORS_LIST'],
        mode: 'any',
      },
      dataCy: 'nav-seniors',
      icon: 'elderly_woman',
      text: 'MENU.SENIORS',
      link: '/seniors',
    },
    {
      params: {
        codes: ['UPLOAD_LIST_OF_SENIORS'],
        mode: 'any',
      },
      dataCy: 'nav-seniors-bulk-update',
      icon: 'cloud_upload',
      text: 'MENU.SENIORS_BULK_UPDATE',
      link: '/seniors-bulk-upload',
    },

    {
      params: {
        codes: ['VIEW_LIMITED_PARTNERS_LIST', 'VIEW_FULL_PARTNERS_LIST'],
        mode: 'any',
      },
      dataCy: 'nav-partners',
      icon: 'handshake',
      text: 'MENU.PARTNERS',
      link: '/partners',
    },
    {
      params: {
        codes: ['VIEW_FULL_ORDERS_LIST'],
        mode: 'any',
      },
      dataCy: 'nav-all-orders',
      icon: 'mail',
      text: 'MENU.ALL_ORDERS',
      link: '/orders',
    },
    {
      params: {
        codes: ['VIEW_FULL_REPORTS', 'VIEW_LIMITED_REPORTS'],
        mode: 'any',
      },
      dataCy: 'nav-all-reports',
      icon: 'monitoring',
      text: 'MENU.REPORTS',
      link: '/reports',
    },

    {
      params: {
        codes: ['VIEW_LIMITED_TOPONYMS_LIST', 'VIEW_FULL_TOPONYMS_LIST'],
        mode: 'any',
      },
      dataCy: 'nav-toponyms',
      icon: 'map',
      text: 'MENU.TOPONYMS',
      link: '/toponyms',
      subMenuItems: [
        {
          params: {
            codes: ['VIEW_LIMITED_TOPONYMS_LIST', 'VIEW_FULL_TOPONYMS_LIST'],
            mode: 'any',
          },
          dataCy: 'nav-countries',
          icon: 'place',
          text: 'MENU.COUNTRIES',
          link: '/countries',
        },
        {
          params: {
            codes: ['VIEW_LIMITED_TOPONYMS_LIST', 'VIEW_FULL_TOPONYMS_LIST'],
            mode: 'any',
          },
          dataCy: 'nav-regions',
          icon: 'corporate_fare',
          text: 'MENU.REGIONS',
          link: '/regions',
        },
        {
          params: {
            codes: ['VIEW_LIMITED_TOPONYMS_LIST', 'VIEW_FULL_TOPONYMS_LIST'],
            mode: 'any',
          },
          dataCy: 'nav-districts',
          icon: 'home_work',
          text: 'MENU.DISTRICTS',
          link: '/districts',
        },
        {
          params: {
            codes: ['VIEW_LIMITED_TOPONYMS_LIST', 'VIEW_FULL_TOPONYMS_LIST'],
            mode: 'any',
          },
          dataCy: 'nav-localities',
          icon: 'holiday_village',
          text: 'MENU.LOCALITIES',
          link: '/localities',
        },
      ],
    },
    {
      params: {
        codes: ['VIEW_FULL_ROLES_LIST'], //TODO: create operations for audit
        mode: 'all',
      },
      dataCy: 'nav-audit',
      icon: 'policy',
      text: 'MENU.AUDIT',
      link: '/audit',
    },
  ];

  menuItems: Menu = [];

  ngOnInit(): void {
    console.log('userId', this.userId);
    this.menuItems = [...this.menu];
  }

  ngOnDestroy(): void {
    this.idle.stop();
  }

  signOut(): void {
    this.auth.logout().subscribe();
  }

  setLanguage(code: 'en' | 'ru') {
    this.lang.set(code);
  }
}
