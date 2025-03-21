export const objects = [
  'toponyms', 'users', 'roles', 'homes', 'partners', 'seniors'
];

export const operations = [
  //countries, regions, districts, localities - страны, регионы, районы/округа, населенные пункты - топонимы
  {
    operation: 'FULL_ACCESS_TOPONYMS',
    operationName: 'полный доступ ко всем операциям',
    description:
      'полный доступ ко всем операциям с данными стран, регионов, районов/округов, населенных пунктов',
    object: 'toponyms',
    objectName: 'страны\nрегионы\nрайоны/округа\nнаселенные пункты',
    fullAccess: true,

    roles: [],
  },
  {
    operation: 'ADD_NEW_TOPONYM',
    operationName: 'создать',
    description:
      'добавить новую страну, регион, район/округ, населенный пункт',
    object: 'toponyms',
    objectName: 'страны\nрегионы\nрайоны/округа\nнаселенные пункты',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'EDIT_TOPONYM',
    operationName: 'редактировать',
    description:
      'редактировать данные страны, региона, района/округа, населенного пункта',
    object: 'toponyms',
    objectName: 'страны\nрегионы\nрайоны/округа\nнаселенные пункты',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'DELETE_TOPONYM',
    operationName: 'удалить',
    description:
      'удалить без возможности восстановления данные страны, региона, района/округа, населенного пункта',
    object: 'toponyms',
    objectName: 'страны\nрегионы\nрайоны/округа\nнаселенные пункты',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'BLOCK_TOPONYM',
    operationName: 'заблокировать',
    description:
      'заблокировать доступ к данным страны, региона, района/округа, населенного пункта',
    object: 'toponyms',
    objectName: 'страны\nрегионы\nрайоны/округа\nнаселенные пункты',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'UNBLOCK_TOPONYM',
    operationName: 'разблокировать',
    description:
      'разблокировать доступ к данным страны, региона, района/округа, населенного пункта',
    object: 'toponyms',
    objectName: 'страны\nрегионы\nрайоны/округа\nнаселенные пункты',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'VIEW_LIMITED_TOPONYMS_LIST',
    operationName: 'доступ к осн. данным списка',
    description:
      'просмотреть с ограниченным доступом к данным списков стран, регионов, районов/округов, населенных пунктов',
    object: 'toponyms',
    objectName: 'страны\nрегионы\nрайоны/округа\nнаселенные пункты',
    fullAccess: false,
    flag: 'LIMITED',


    roles: [],
  },
  {
    operation: 'VIEW_FULL_TOPONYMS_LIST',
    operationName: 'доступ к доп. данным списка',
    description:
      'просмотреть с полным доступом к данным списков с ограниченным доступом список стран, регионов, районов/округов, населенных пунктов',
    object: 'toponyms',
    objectName: 'страны\nрегионы\nрайоны/округа\nнаселенные пункты',
    fullAccess: false,
    roles: [],
    flag: 'FULL',
  },
  //users - пользователи
  {
    operation: 'FULL_ACCESS_USERS',
    operationName: 'полный доступ ко всем операциям',
    description: 'полный доступ ко всем операциям с данными пользователей',
    object: 'users',
    objectName: 'пользователи',
    fullAccess: true,

    roles: [],
  },
  {
    operation: 'ADD_NEW_USER',
    operationName: 'создать',
    description: 'добавить нового пользователя',
    object: 'users',
    objectName: 'пользователи',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'VIEW_USER',
    operationName: 'просмотреть',
    description: 'просмотреть карточку (данные) пользователя',
    object: 'users',
    objectName: 'пользователи',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'EDIT_USER',
    operationName: 'редактировать',
    description: 'редактировать карточку (данные) пользователя',
    object: 'users',
    objectName: 'пользователи',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'DELETE_USER',
    operationName: 'удалить',
    description:
      'удалить без возможности восстановления карточку (данные) пользователя',
    object: 'users',
    objectName: 'пользователи',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'BLOCK_USER',
    operationName: 'заблокировать',
    description: 'заблокировать пользователя',
    object: 'users',
    objectName: 'пользователи',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'UNBLOCK_USER',
    operationName: 'разблокировать',
    description: 'разблокировать пользователя',
    object: 'users',
    objectName: 'пользователи',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'VIEW_LIMITED_USERS_LIST',
    operationName: 'доступ к осн. данным списка',
    description: 'просмотреть с ограниченным доступом к данным списка пользователей',
    object: 'users',
    objectName: 'пользователи',
    fullAccess: false,
    flag: 'LIMITED',

    roles: [],
  },
  {
    operation: 'VIEW_FULL_USERS_LIST',
    operationName: 'доступ к доп. данным списка',
    description: 'просмотреть с полным доступом к данным списка пользователей',
    object: 'users',
    objectName: 'пользователи',
    fullAccess: false,
    flag: 'FULL',
    roles: [],
  },
  //roles - роли
  {
    operation: 'FULL_ACCESS_ROLES',
    operationName: 'полный доступ ко всем операциям',
    description: 'полный доступ ко всем операциям с ролями',
    object: 'roles',
    objectName: 'роли',
    fullAccess: true,
    roles: [],
  },
  {
    operation: 'ADD_NEW_ROLE',
    operationName: 'создать',
    description: 'создать новую роль',
    object: 'roles',
    objectName: 'роли',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'EDIT_ROLE',
    operationName: 'редактировать',
    description: 'редактировать роль (изменить права доступа)',
    object: 'roles',
    objectName: 'роли',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'DELETE_ROLE',
    operationName: 'удалить',
    description: 'удалить без возможности восстановления роль',
    object: 'roles',
    objectName: 'роли',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'VIEW_LIMITED_ROLES_LIST',
    operationName: 'доступ к осн. данным списка',
    description: 'просмотреть с ограниченным доступом к данным списка ролей',
    object: 'roles',
    objectName: 'роли',
    fullAccess: false,
    flag: 'LIMITED',
    roles: [],
  },
  {
    operation: 'VIEW_FULL_ROLES_LIST',
    operationName: 'доступ к доп. данным списка',
    description: 'просмотреть с ограниченным доступом к данным списка с ограниченным доступом список ролей',
    object: 'roles',
    objectName: 'роли',
    flag: 'FULL',
    roles: [],
  },
  //nursing homes - интернаты
  {
    operation: 'FULL_ACCESS_HOMES',
    operationName: 'полный доступ ко всем операциям',
    description: 'полный доступ ко всем операциям с интернатами',
    object: 'homes',
    objectName: 'интернаты',
    fullAccess: true,
    roles: [],
  },
  {
    operation: 'ADD_NEW_HOME',
    operationName: 'создать',
    description: 'добавить новый интернат',
    object: 'homes',
    objectName: 'интернаты',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'VIEW_HOME',
    operationName: 'просмотреть',
    description: 'просмотреть карточку (данные) интерната',
    object: 'homes',
    objectName: 'интернаты',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'EDIT_HOME',
    operationName: 'редактировать',
    description: 'редактировать карточку (данные) интерната',
    object: 'homes',
    objectName: 'интернаты',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'DELETE_HOME',
    operationName: 'удалить',
    description:
      'удалить без возможности восстановления карточку (данные) интерната',
    object: 'homes',
    objectName: 'интернаты',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'BLOCK_HOME',
    operationName: 'заблокировать',
    description: 'исключить интернат из списка участвующих в поздравлении',
    object: 'homes',
    objectName: 'интернаты',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'UNBLOCK_HOME',
    operationName: 'разблокировать',
    description: 'вернуть интернат в список участвующих в поздравлении',
    object: 'homes',
    objectName: 'интернаты',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'VIEW_LIMITED_HOMES_LIST',
    operationName: 'доступ к осн. данным списка',
    description: 'просмотреть с ограниченным доступом к данным списка интернатов',
    object: 'homes',
    objectName: 'интернаты',
    fullAccess: false,
    flag: 'LIMITED',
    roles: [],
  },
  {
    operation: 'VIEW_FULL_HOMES_LIST',
    operationName: 'доступ к доп. данным списка',
    description: 'просмотреть с полным доступом к данным списка интернатов',
    object: 'homes',
    objectName: 'интернаты',
    fullAccess: false,
    flag: 'FULL',
    roles: [],
  },
  //partners - представители интернатов (сотрудники и координаторы) - контрагенты
  {
    operation: 'FULL_ACCESS_PARTNERS',
    operationName: 'полный доступ ко всем операциям',
    description: 'полный доступ ко всем операциям с данными контрагентов',
    object: 'partners',
    objectName: 'представители\nинтернатов',
    fullAccess: true,
    roles:
      [],
  },
  {
    operation: 'ADD_NEW_PARTNER',
    operationName: 'создать',
    description: 'добавить нового контрагента',
    object: 'partners',
    objectName: 'представители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'VIEW_PARTNER',
    operationName: 'просмотреть',
    description: 'просмотреть карточку (данные) контрагента',
    object: 'partners',
    objectName: 'представители\nинтернатов',
    fullAccess: false,
    roles: [],
  },
  {
    operation: 'EDIT_PARTNER',
    operationName: 'редактировать',
    description: 'редактировать карточку (данные) контрагента',
    object: 'partners',
    objectName: 'представители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'DELETE_PARTNER',
    operationName: 'удалить',
    description:
      'удалить без возможности восстановления карточку (данные) контрагента',
    object: 'partners',
    objectName: 'представители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'BLOCK_PARTNER',
    operationName: 'заблокировать',
    description:
      'заблокировать контрагента (в случае увольнения, прекращения деятельности и т.д.)',
    object: 'partners',
    objectName: 'представители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'UNBLOCK_PARTNER',
    operationName: 'разблокировать',
    description: 'разблокировать контрагента',
    object: 'partners',
    objectName: 'представители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'VIEW_LIMITED_PARTNERS_LIST',
    operationName: 'доступ к осн. данным списка',
    description: 'просмотреть с ограниченным доступом к данным списка контрагентов',
    object: 'partners',
    objectName: 'представители\nинтернатов',
    fullAccess: false,
    flag: 'LIMITED',
    roles: [],
  },
  {
    operation: 'VIEW_FULL_PARTNERS_LIST',
    operationName: 'доступ к доп. данным списка',
    description: 'просмотреть с полным доступом к данным списка контрагентов',
    object: 'partners',
    objectName: 'представители\nинтернатов',
    fullAccess: false,
    flag: 'FULL',
    roles: [],
  },
  //seniors - жители интернатов
  {
    operation: 'FULL_ACCESS_SENIORS',
    operationName: 'полный доступ ко всем операциям',
    description:
      'полный доступ ко всем операциям с данными жителей интернатов',
    object: 'seniors',
    objectName: 'жители\nинтернатов',
    fullAccess: true,

    roles: [],
  },
  {
    operation: 'ADD_NEW_SENIOR',
    operationName: 'создать',
    description: 'добавить нового жителя интерната',
    object: 'seniors',
    objectName: 'жители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'VIEW_SENIOR',
    operationName: 'просмотреть',
    description: 'просмотреть карточку (данные) жителя интерната',
    object: 'seniors',
    objectName: 'жители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'EDIT_SENIOR',
    operationName: 'редактировать',
    description: 'редактировать карточку (данные) жителя интерната',
    object: 'seniors',
    objectName: 'жители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'DELETE_SENIOR',
    operationName: 'удалить',
    description:
      'удалить без возможности восстановления карточку (данные) жителя интерната',
    object: 'seniors',
    objectName: 'жители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'BLOCK_SENIOR',
    operationName: 'заблокировать',
    description:
      'заблокировать жителя интерната (исключить из списков поздравляемых в связи с временным отсутствием, отказом от получения открыток или по иным причинам)',
    object: 'seniors',
    objectName: 'жители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'UNBLOCK_SENIOR',
    operationName: 'разблокировать',
    description: 'разблокировать жителя интерната',
    object: 'seniors',
    objectName: 'жители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'UPDATE_LIST_OF_SENIORS',
    operationName: 'обновить списком',
    description: 'обновить список жителей интерната, загрузив xlsx-файл',
    object: 'seniors',
    objectName: 'жители\nинтернатов',
    fullAccess: false,

    roles: [],
  },
  {
    operation: 'VIEW_LIMITED_SENIORS_LIST',
    operationName: 'доступ к осн. данным списка',
    description: 'просмотреть с ограниченным доступом к данным списка жителей интернатов',
    object: 'seniors',
    objectName: 'жители\nинтернатов',
    fullAccess: false,
    flag: 'LIMITED',
    roles: [],
  },
  {
    operation: 'VIEW_FULL_SENIORS_LIST',
    operationName: 'доступ к доп. данным списка',
    description:
      'просмотреть с полным доступом к данным списка жителей интернатов',
    object: 'seniors',
    objectName: 'жители\nинтернатов',
    fullAccess: false,
    flag: 'FULL',
    roles: [],
  },
];
