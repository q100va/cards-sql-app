import {
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  model,
  signal,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry, MatIconModule } from '@angular/material/icon';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDrawerMode, MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import {
  MatButtonToggle,
  MatButtonToggleModule,
} from '@angular/material/button-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import {
  ConfigurableFocusTrapFactory,
  FocusTrapFactory,
} from '@angular/cdk/a11y';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { CreateUserDialogComponent } from '../../shared/dialogs/create-user-dialog/create-user-dialog.component';
import { CauseOfBlockingDialogComponent } from '../../shared/dialogs/cause-of-blocking-dialog/cause-of-blocking-dialog.component';
import { UserService } from '../../services/user.service';
import { User } from '../../interfaces/user';
import { TableSettingsComponent } from '../../shared/table-settings/table-settings.component';
import { TableFilterComponent } from '../../shared/table-filter/table-filter.component';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-users-list',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatTableModule,
    MatSortModule,
    MatGridListModule,
    MatPaginatorModule,
    MatIconModule,
    Toast,
    MatSidenavModule,
    FormsModule,
    MatBadgeModule,
    MatButtonToggleModule,
    ReactiveFormsModule,
    MatMenuModule,
    TableSettingsComponent,
    TableFilterComponent,
    ConfirmDialogModule,
    MatCheckboxModule,
  ],
  providers: [
    MessageService,
    ConfirmationService,
    MessageService,
    { provide: FocusTrapFactory, useClass: ConfigurableFocusTrapFactory },
  ],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css',
})
export class UsersListComponent implements OnInit, AfterViewInit {
  //  private datePipe = inject(DatePipe);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  readonly dialog = inject(MatDialog);
  dataSource!: MatTableDataSource<User>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(TableFilterComponent) tableFilterComponent!: TableFilterComponent;

  settingsBadgeValue: number = 0;
  filterBadgeValue: number = 0;
  users!: User[];
  length = signal<number>(0);
  currentPage = 1;
  pageSize = 5;
  pageSizeOptions = [5, 10, 25, 50, 100];

  contactTypes = [
    {
      type: 'email',
      label: 'Email',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#5f6368"><path d="M174.31-182q-37.73 0-64.02-26.3T84-272.35v-415.62q0-37.75 26.29-63.89T174.31-778h611.38q37.73 0 64.02 26.3T876-687.65v415.62q0 37.75-26.29 63.89T785.69-182H174.31ZM480-426.69 162-609.31v337q0 5.39 3.46 8.85t8.85 3.46h611.38q5.39 0 8.85-3.46t3.46-8.85v-337L480-426.69Zm0-90.31 319.85-183h-639.7L480-517Zm-326-92.31V-700v427.69q6 5.39 10.46 8.85 4.46 3.46 9.85 3.46H154v-349.31Z"/></svg>`,
    },
    {
      type: 'phoneNumber',
      label: 'Номер телефона',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#5f6368"><path d="M774.47-133q-123.93-9-236.55-61.08-112.61-52.08-203.19-142.34-90.57-90.27-141.65-202.7Q142-651.54 132-775.47q-2-23.31 11.29-37.92Q156.57-828 180-828h142.46q18.54 0 31.93 10.89 13.38 10.88 19.53 28.42L398.85-675q2.38 11.38-1.5 24.15-3.89 12.77-10.66 18.77l-101.38 99.93q21.3 38.84 46.96 73.77 25.65 34.92 58.01 68.06 30.95 29.94 65.03 55.67t71.08 45.04l110.76-104.54q7.39-7.77 13.85-9.2 6.46-1.42 15.62.58l120.07 27.62q18.15 5 29.73 18.46 11.58 13.46 11.58 32V-181q0 23.43-15.11 36.71Q797.78-131 774.47-133ZM249.92-606.92l67.39-64.31q1.92-1.54 2.5-4.23.58-2.69-.19-5l-16.55-63.39q-.77-3.07-2.69-4.61-1.92-1.54-5-1.54H220q-2.31 0-3.85 1.54-1.53 1.54-1.53 3.85 3.07 40 12.92 71.8 9.84 31.81 22.38 65.89Zm354 355.69q33.87 14.78 70.01 22.47 36.15 7.68 70.68 13.53 2.31 2 3.85-.54t1.54-4.85v-78.15q0-3.08-1.54-5t-4.61-2.69l-65-15.08q-2.31-.77-4.04-.19-1.73.58-3.66 2.5l-67.23 68Zm-354-355.69Zm354 355.69Z"/></svg>`,
    },
    {
      type: 'whatsApp',
      label: 'WhatsApp',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,255.98438,255.98438">
      <g fill="#5f6368" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(10.66667,10.66667)"><path d="M12.01172,2c-5.506,0 -9.98823,4.47838 -9.99023,9.98438c-0.001,1.76 0.45998,3.47819 1.33398,4.99219l-1.35547,5.02344l5.23242,-1.23633c1.459,0.796 3.10144,1.21384 4.77344,1.21484h0.00391c5.505,0 9.98528,-4.47937 9.98828,-9.98437c0.002,-2.669 -1.03588,-5.17841 -2.92187,-7.06641c-1.886,-1.887 -4.39245,-2.92673 -7.06445,-2.92773zM12.00977,4c2.136,0.001 4.14334,0.8338 5.65234,2.3418c1.509,1.51 2.33794,3.51639 2.33594,5.65039c-0.002,4.404 -3.58423,7.98633 -7.99023,7.98633c-1.333,-0.001 -2.65341,-0.3357 -3.81641,-0.9707l-0.67383,-0.36719l-0.74414,0.17578l-1.96875,0.46484l0.48047,-1.78516l0.2168,-0.80078l-0.41406,-0.71875c-0.698,-1.208 -1.06741,-2.58919 -1.06641,-3.99219c0.002,-4.402 3.58528,-7.98437 7.98828,-7.98437zM8.47656,7.375c-0.167,0 -0.43702,0.0625 -0.66602,0.3125c-0.229,0.249 -0.875,0.85208 -0.875,2.08008c0,1.228 0.89453,2.41503 1.01953,2.58203c0.124,0.166 1.72667,2.76563 4.26367,3.76563c2.108,0.831 2.53614,0.667 2.99414,0.625c0.458,-0.041 1.47755,-0.60255 1.68555,-1.18555c0.208,-0.583 0.20848,-1.0845 0.14648,-1.1875c-0.062,-0.104 -0.22852,-0.16602 -0.47852,-0.29102c-0.249,-0.125 -1.47608,-0.72755 -1.70508,-0.81055c-0.229,-0.083 -0.3965,-0.125 -0.5625,0.125c-0.166,0.25 -0.64306,0.81056 -0.78906,0.97656c-0.146,0.167 -0.29102,0.18945 -0.54102,0.06445c-0.25,-0.126 -1.05381,-0.39024 -2.00781,-1.24024c-0.742,-0.661 -1.24267,-1.47656 -1.38867,-1.72656c-0.145,-0.249 -0.01367,-0.38577 0.11133,-0.50977c0.112,-0.112 0.24805,-0.2915 0.37305,-0.4375c0.124,-0.146 0.167,-0.25002 0.25,-0.41602c0.083,-0.166 0.04051,-0.3125 -0.02149,-0.4375c-0.062,-0.125 -0.54753,-1.35756 -0.76953,-1.85156c-0.187,-0.415 -0.3845,-0.42464 -0.5625,-0.43164c-0.145,-0.006 -0.31056,-0.00586 -0.47656,-0.00586z"></path></g></g>
      </svg>`,
    },
    {
      type: 'telegram',
      label: 'Телеграм',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,255.98438,255.98438">
      <g fill="#5f6368" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(10.66667,10.66667)"><path d="M20.57227,3.01172c-0.33237,-0.03525 -0.69364,0.01666 -1.05664,0.16016c-0.45,0.177 -7.50122,3.14316 -14.07422,5.91016l-2.17188,0.91406c-0.841,0.341 -1.26562,0.89558 -1.26562,1.64258c0,0.523 0.22134,1.23239 1.27734,1.65039l3.66602,1.46875c0.317,0.951 1.05328,3.15909 1.23828,3.74609c0.11,0.348 0.38784,1.22469 1.08984,1.42969c0.144,0.049 0.29427,0.07422 0.44727,0.07422c0.443,0 0.76197,-0.20617 0.91797,-0.32617l2.33008,-1.9707l2.83008,2.61719c0.109,0.111 0.68594,0.67188 1.46094,0.67188c0.967,0 1.70051,-0.80498 1.85352,-1.58398c0.083,-0.427 2.8125,-14.12895 2.8125,-14.12695c0.245,-1.099 -0.19552,-1.66911 -0.47852,-1.91211c-0.2425,-0.2075 -0.54458,-0.32998 -0.87695,-0.36523zM19.91016,5.17188c-0.377,1.89 -2.43214,12.20636 -2.74414,13.69336l-4.13672,-3.82617l-2.80664,2.37695l0.77734,-3.04102c0,0 5.36255,-5.42814 5.68555,-5.74414c0.26,-0.253 0.31445,-0.34169 0.31445,-0.42969c0,-0.117 -0.06022,-0.20117 -0.19922,-0.20117c-0.125,0 -0.29477,0.11978 -0.38477,0.17578c-1.14335,0.71282 -6.01192,3.48646 -8.4082,4.84961l-3.47656,-1.38867l1.6875,-0.70899c4.299,-1.81 11.95541,-5.03386 13.69141,-5.75586z"></path></g></g>
      </svg>`,
    },

    {
      type: 'vKontakte',
      label: 'Вконтакте',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,255.98438,255.98438">
      <g fill="#5f6368" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(10.66667,10.66667)"><path d="M12,2c-5.51101,0 -10,4.489 -10,10c0,5.511 4.48899,10 10,10c5.51101,0 10,-4.489 10,-10c0,-5.511 -4.48899,-10 -10,-10zM12,4c4.43013,0 8,3.56988 8,8c0,4.43012 -3.56987,8 -8,8c-4.43013,0 -8,-3.56988 -8,-8c0,-4.43012 3.56987,-8 8,-8zM6.44531,8.5c-0.381,0 -0.44531,0.18672 -0.44531,0.38672c0,0.361 0.2995,2.30978 1.9375,4.55078c1.187,1.626 2.75172,2.5625 4.13672,2.5625c0.839,0 0.92578,-0.21387 0.92578,-0.54687v-1.48633c0,-0.401 0.09238,-0.4668 0.35938,-0.4668c0.191,0 0.57813,0.125 1.32813,1c0.865,1.009 1.02158,1.5 1.51758,1.5h1.31055c0.304,0 0.47933,-0.127 0.48633,-0.375c0.001,-0.063 -0.0083,-0.13489 -0.0293,-0.21289c-0.097,-0.288 -0.5407,-0.99111 -1.0957,-1.66211c-0.308,-0.372 -0.611,-0.74045 -0.75,-0.93945c-0.095,-0.131 -0.13095,-0.22255 -0.12695,-0.31055c0.004,-0.092 0.052,-0.18169 0.125,-0.30469c-0.013,0 1.67875,-2.37383 1.84375,-3.17383c0.023,-0.076 0.03425,-0.14698 0.03125,-0.20898c-0.008,-0.181 -0.13278,-0.3125 -0.42578,-0.3125h-1.30859c-0.33,0 -0.48327,0.19939 -0.57227,0.40039c0,0 -0.81486,1.67911 -1.75586,2.78711c-0.305,0.32 -0.46,0.3125 -0.625,0.3125c-0.088,0 -0.3125,-0.10639 -0.3125,-0.40039v-2.5918c0,-0.347 -0.08523,-0.50781 -0.36523,-0.50781h-2.32422c-0.204,0 -0.31055,0.15931 -0.31055,0.32031c0,0.333 0.449,0.41461 0.5,1.34961v1.81055c0,0.44 -0.07523,0.51953 -0.24023,0.51953c-0.445,0 -1.3212,-1.5008 -1.9082,-3.4668c-0.127,-0.387 -0.25398,-0.5332 -0.58398,-0.5332z"></path></g></g>
      </svg>`,
    },
    {
      type: 'instagram',
      label: 'Instagram',
      svg: `<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none" stroke="#5f6368" stroke-width="1.8934080000000002"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-circle-letter-i"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 8v8" /></svg>`,
    },
    {
      type: 'facebook',
      label: 'Facebook',
      svg: `<svg height="68px" width="68px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-5.74 -5.74 68.86 68.86" xml:space="preserve" fill="#5f6368" stroke="#5f6368" stroke-width="1.8934080000000002"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path style="fill:#5f6368;" d="M28.689,0C12.87,0,0.001,12.869,0.001,28.688c0,15.818,12.87,28.688,28.689,28.688 c15.816,0,28.686-12.869,28.686-28.688S44.507,0,28.689,0z M28.689,54.375c-14.165,0-25.689-11.523-25.689-25.688 c0-14.164,11.524-25.688,25.689-25.688c14.163,0,25.686,11.523,25.686,25.688S42.853,54.375,28.689,54.375z"></path> <path style="fill:#5f6368;" d="M36.786,15.863H21.941c-0.553,0-1,0.447-1,1V39.97c0,0.554,0.447,1,1,1h3.532c0.553,0,1-0.446,1-1 v-7.786c0-0.554,0.447-1,1-1h8.461c0.553,0,1-0.447,1-1v-3.107c0-0.553-0.447-1-1-1h-8.461c-0.553,0-1-0.447-1-1v-3.105 c0-0.553,0.447-1,1-1h9.312c0.553,0,1-0.447,1-1v-3.107C37.786,16.311,37.339,15.863,36.786,15.863z"></path> </g> </g> </g></svg>`,
    },
    {
      type: 'otherContact',
      label: 'Другой контакт',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#5f6368"><path d="M480.39-96q-79.52 0-149.45-30Q261-156 208.5-208.5T126-330.96q-30-69.96-30-149.5t30-149.04q30-69.5 82.5-122T330.96-834q69.96-30 149.5-30t149.04 30q69.5 30 122 82.5t82.5 122Q864-560 864-480v60q0 54.85-38.5 93.42Q787-288 732-288q-34 0-62.5-17t-48.66-45Q593-321 556.5-304.5T480-288q-79.68 0-135.84-56.23-56.16-56.22-56.16-136Q288-560 344.23-616q56.22-56 136-56Q560-672 616-615.84q56 56.16 56 135.84v60q0 25.16 17.5 42.58Q707-360 732-360t42.5-17.42Q792-394.84 792-420v-60q0-130-91-221t-221-91q-130 0-221 91t-91 221q0 130 91 221t221 91h192v72H480.39ZM480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z"/></svg>`,
    },
  ];
  implicitlyDisplayedColumns: {
    id: number;
    columnName: string;
    columnFullName: string;
    isUnchangeable: boolean;
  }[] = [
    {
      id: 1,
      columnName: 'userName',
      columnFullName: 'Имя пользователя',
      isUnchangeable: true,
    },
    {
      id: 2,
      columnName: 'role',
      columnFullName: 'Роль',
      isUnchangeable: false,
    },
    { id: 3, columnName: 'name', columnFullName: 'ФИО', isUnchangeable: false },
    {
      id: 4,
      columnName: 'contacts',
      columnFullName: 'Контакты',
      isUnchangeable: false,
    },
    {
      id: 5,
      columnName: 'addresses',
      columnFullName: 'Адрес',
      isUnchangeable: false,
    },
    {
      id: 6,
      columnName: 'dateOfStart',
      columnFullName: 'Дата присоединения',
      isUnchangeable: false,
    },
    {
      id: 7,
      columnName: 'comment',
      columnFullName: 'Комментарий',
      isUnchangeable: false,
    },
    {
      id: 8,
      columnName: 'isRestricted',
      columnFullName: 'Статус',
      isUnchangeable: false,
    },
    {
      id: 9,
      columnName: 'actions',
      columnFullName: 'Действия',
      isUnchangeable: false,
    },
    /*     {
      id: 9,
      columnName: 'view',
      columnFullName: 'Открыть',
      isUnchangeable: false,
    },
    {
      id: 10,
      columnName: 'restrict',
      columnFullName: 'Заблокировать/разблокировать',
      isUnchangeable: false,
    },
    {
      id: 11,
      columnName: 'delete',
      columnFullName: 'Удалить',
      isUnchangeable: false,
    }, */
  ];
  displayedColumns = this.implicitlyDisplayedColumns.map(
    (item) => item.columnName
  );
  viewOptions = [
    {
      id: 'all',
      name: 'Все пользователи',
      initiallySelected: false,
    },
    {
      id: 'only-active',
      name: 'Только активные',
      initiallySelected: true,
    },
    {
      id: 'only-blocked',
      name: 'Только заблокированные',
      initiallySelected: false,
    },
  ];

  avoidDoubleRequest = false;

  selectedViewOptionId = signal<string>('only-active');
  notOnlyActual = signal<boolean>(false);
  exactMatch = signal<boolean>(false);
  searchValue = signal<string>('');
  sortParameters = signal<{
    active: string;
    direction: 'asc' | 'desc' | '';
  }>({
    active: '',
    direction: '',
  });
  filterValue = signal<{
    [key: string]: string[] | Date[] | null | { [key: string]: string }[];
  }>({
    roles: null,
    comment: null,
    contactTypes: null,
    dateBeginningRange: null,
    dateRestrictionRange: null,
  });

  addressFilterValue = signal<{
    [key: string]: number[] | null | [];
  }>({
    countries: null,
    regions: null,
    districts: null,
    localities: null,
  });

  addressStringValue = signal<string>('');

  strongAddressFilter = signal<boolean>(false);
  strongContactFilter = signal<boolean>(false);

  // const doubleCount: Signal<number> = computed(() => count() * 2);

  allFilterParameters = computed(() => {
    //console.log('this.strongContactFilter()');
    //console.log(this.strongContactFilter());
    console.log('this.addressFilterValue()');
    console.log(this.addressFilterValue());
    return {
      viewOption: this.selectedViewOptionId(),
      searchValue: this.searchValue(),
      notOnlyActual: this.notOnlyActual(),
      exactMatch: this.exactMatch(),
      filter: this.filterValue(),
      addressFilter: this.addressFilterValue(),
      sortParameters: this.sortParameters(),
      strongAddressFilter: this.strongAddressFilter(),
      strongContactFilter: this.strongContactFilter(),
    };
  });
  /*     result = computed(() => {
      console.log('result computed');
    this.getUsers();
    return this.allFilterParameters();
  }); */

  filterString = computed(() => {
    // console.log('filterString computed');
    let filterString = '';
    let viewOption = this.viewOptions.find(
      // (item) => item.id == this.selectedViewOptionId()
      (item) => item.id == this.allFilterParameters().viewOption
    )?.name;
    filterString = filterString + viewOption + ', ';
    filterString =
      filterString +
      (this.allFilterParameters().searchValue
        ? this.allFilterParameters().searchValue + ', '
        : '');
    let filterData = this.allFilterParameters().filter;
    for (let key of this.objectKeys(filterData)) {
      if (filterData[key] && filterData[key]!.length > 0) {
        if (key == 'dateBeginningRange') {
          filterString =
            filterString +
            'нач.: ' +
            this.transformDate(filterData[key]![0] as Date) +
            '-' +
            this.transformDate(filterData[key]![1] as Date) +
            ', ';
        } else if (key == 'dateRestrictionRange') {
          filterString =
            filterString +
            'блок.: ' +
            this.transformDate(filterData[key]![0] as Date) +
            '-' +
            this.transformDate(filterData[key]![1] as Date) +
            ', ';
        } else {
          for (let item of filterData[key]!) {
            if (key == 'contactTypes') {
              console.log('item');
              console.log(item);
              let contactType = item as {
                [key: string]: string;
              };
              filterString = filterString + contactType['label'] + ', ';
            } else filterString = filterString + item + ', ';
          }
        }
      }
    }
    filterString = filterString.slice(0, -2);

    let result = this.addressStringValue()
      ? filterString + ', ' + this.addressStringValue()
      : filterString;
    this.getUsers();
    return result;
  });

  defaultAddressParams: {
    localityId: number | null;
    districtId: number | null;
    regionId: number | null;
    countryId: number | null;
  } = {
    localityId: null,
    districtId: null,
    regionId: null,
    countryId: null,
  };

  constructor() {
    const iconRegistry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);
    for (let item of this.contactTypes) {
      iconRegistry.addSvgIconLiteral(
        item.type,
        sanitizer.bypassSecurityTrustHtml(item.svg)
      );
    }

        this.route.queryParams.subscribe((params) => {
      this.defaultAddressParams.localityId = params['localityId'];
      this.defaultAddressParams.districtId = params['districtId'];
      this.defaultAddressParams.regionId = params['regionId'];
      this.defaultAddressParams.countryId = params['countryId'];
    });
    console.log('this.defaultAddressParams in user-list');
    console.log(this.defaultAddressParams);
  }

  ngOnInit() {


    //console.log(navigation);
  }
  ngAfterViewInit() {}

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  onAddUserClick() {
    const dialogRef = this.dialog.open(CreateUserDialogComponent, {
      disableClose: true,
      minWidth: '800px',
      height: '80%',
    });
    dialogRef.afterClosed().subscribe((result) => {
      //console.log('The dialog was closed');
      if (result.userName) {
        this.getUsers();
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Аккаунт пользователя ${result.userName} успешно создан!`,
        });
      }
    });
  }

  changeColumnsView(selectedColumns: string[]) {
    this.displayedColumns = [...selectedColumns];
    //console.log(this.displayedColumns);
  }
  changeSettingsBadge(settingsBadgeValue: number) {
    this.settingsBadgeValue = settingsBadgeValue;
  }
  changeFilterBadge(filterBadgeValue: number) {
    this.filterBadgeValue = filterBadgeValue;
    // console.log(this.filterBadgeValue);
  }

  onOpenUserCardClick(id: number) {
    console.log(id);
  }

  onBlockUserClick(id: number) {
    //console.log(id);
    const blockingUser = this.users.find((item) => item.id == id)!.userName;
    const dialogRef = this.dialog.open(CauseOfBlockingDialogComponent, {
      data: { userName: blockingUser, userId: id },
      minWidth: '400px',
      height: '40%',
    });

    dialogRef.afterClosed().subscribe((result) => {
      //console.log('The dialog was closed');
      if (result.success) {
        this.getUsers();
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Пользователь ${blockingUser} был заблокирован.`,
        });
      }
    });
  }

  onShowUsersOrdersClick(id: number) {}

  onShowUsersSubscribersClick(id: number) {}

  onUnblockUserClick(id: number) {
    const unblockingUser = this.users.find((item) => item.id == id)!.userName;
    this.confirmationService.confirm({
      message: `Вы уверены, что хотите разблокировать пользователя ${unblockingUser}?`,
      header: 'Предупреждение',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Нет',
      },
      acceptButtonProps: {
        label: 'Да',
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        this.unblockUser(id, unblockingUser);
      },
      reject: () => {},
    });
  }

  unblockUser(id: number, unblockingUser: string) {
    this.userService.unblockUser(id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Аккаунт пользователя ${unblockingUser} был разбокирован.`,
          sticky: false,
        });
        this.getUsers();
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
  }

  onDeleteUserClick(id: number) {
    //console.log(id);
    const deletingUser = this.users.find((item) => item.id == id)!.userName;
    this.confirmationService.confirm({
      message: `Вы уверены, что хотите удалить пользователя ${deletingUser}?<br />Данные невозможно будет восстановить!`,
      header: 'Предупреждение',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Нет',
      },
      acceptButtonProps: {
        label: 'Да',
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        this.checkPossibilityToDeleteUser(id, deletingUser);
      },
      reject: () => {},
    });
  }

  checkPossibilityToDeleteUser(id: number, deletingUser: string) {
    this.userService.checkPossibilityToDeleteUser(id).subscribe({
      next: (res) => {
        if (res.data) {
          this.deleteUser(id, deletingUser);
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Ошибка',
            detail: `Пользователя ${deletingUser} невозможно удалить!\nОн является автором данных в приложении.\nРекомендуется применить блокировку вместо удаления.`,
            sticky: true,
          });
        }
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
  }

  deleteUser(id: number, deletingUser: string) {
    this.userService.deleteUser(id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Аккаунт пользователя ${deletingUser} был удален.`,
          sticky: false,
        });
        this.getUsers();
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
  }

  onChangedPage(pageData: PageEvent) {
    /*  console.log('pageData');
    console.log(pageData); */
    this.currentPage = pageData.pageIndex + 1;
    this.pageSize = pageData.pageSize;
    if (!this.avoidDoubleRequest) {
      //console.log('pageData');
      this.getUsers();
    } else {
      this.avoidDoubleRequest = false;
    }

    //this.postsService.getPosts(this.postsPerPage, this.currentPage);
    // this.isShowAll = !this.isShowAll;
  }

  onChangeViewSelection(option: string) {
    /*     chip.select();
    console.log(chip.value); */
    this.avoidDoubleRequest = true;
    this.paginator.firstPage();
    this.selectedViewOptionId.set(option);
    // this.avoidDoubleRequest = false;
    // this.getUsers();
  }

  sortData(sort: Sort) {
   // console.log('sort');
    //console.log(sort);
    this.sortParameters.set(sort);
    //this.getUsers();
  }

  searchUser(event: Event) {
    let searchString = (event.target as HTMLInputElement).value;
    searchString = searchString.trim().toLowerCase().replaceAll('ё', 'е');
    this.avoidDoubleRequest = true;
    this.paginator.firstPage();
    this.searchValue.set(searchString);
    // this.avoidDoubleRequest = false;
    //this.getUsers();
  }

  onClearSearchClick() {
    this.avoidDoubleRequest = true;
    this.paginator.firstPage();
    this.searchValue.set('');
    //this.avoidDoubleRequest = false;
    //this.getUsers();
  }

  onClearFilterClick() {
    /*     console.log('pageData');
          console.log(pageData);
 */
    this.avoidDoubleRequest = true;
    this.paginator.firstPage();
    this.tableFilterComponent.clearForm();
    // this.avoidDoubleRequest = false;
    //this.getUsers();
  }

  goToFirstPage() {
    this.avoidDoubleRequest = true;
    this.paginator.firstPage();
  }

  getUsers() {
    // this.pageSize, this.currentPage
   // console.log('WORK');
    this.userService
      .getListOfUsers(
        this.allFilterParameters(),
        this.pageSize,
        this.currentPage
      )
      .subscribe({
        next: (res) => {
          this.users = res.data.users;
          this.length.set(res.data.length);
          //console.log('this.users');
          //console.log(this.users);
          for (let user of this.users) {
            let orderedContacts: { [key: string]: string[] } = {};
            if (user.contacts) {
              for (let contact of user.contacts) {
                if (
                  contact.type == 'telegramNickname' ||
                  contact.type == 'telegramPhoneNumber' ||
                  contact.type == 'telegramId'
                ) {
                  contact.type = 'telegram';
                }
                if (!orderedContacts[contact.type]) {
                  orderedContacts[contact.type] = [];
                  orderedContacts[contact.type].push(contact.content);
                } else {
                  orderedContacts[contact.type].push(contact.content);
                }
              }
            }
            user.orderedContacts =
              orderedContacts as typeof user.orderedContacts;
          }
          // console.log('this.users');
          // console.log(this.users);
          // Assign the data to the data source for the table to render
          this.dataSource = new MatTableDataSource(this.users);
          /*            console.log('this.paginator');
        console.log(this.paginator);
        console.log('this.sort');
        console.log(this.sort);
        console.log('this.length');
        console.log(this.length()); */
          //this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        },
        error: (err) => {
          console.log(err);
          let errorMessage =
            typeof err.error === 'string'
              ? err.error
              : 'Ошибка: ' + err.message;
          this.messageService.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: errorMessage,
            sticky: true,
          });
        },
      });
  }
  /*
  changeDateFormat(date: string) {
    //let newDate = new Date(date);
    //let localDate = newDate.toLocaleDateString();
    let localDate = this.transformDate(new Date(date));
    console.log("localDate");
    console.log(localDate);
    return localDate;
  } */

  transformDate(date: Date | string): string | null {
    return new DatePipe('ru').transform(date, 'dd.MM.yyyy');
  }
}
