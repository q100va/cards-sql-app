export interface User {
  id?: number | null;
  userName: string;
  password: string;
  firstName: string;
  patronymic: string | null;
  lastName: string;
  roleId?: number ;
  //roleName?: {name: string};
  role?:{name: string};
  addresses: [
    {
      country: number | null;
      region: number | null;
      district: number | null;
      locality: number | null;
    }
  ];
  comment: string;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  contacts?: [{ type: string; content: string }];
  orderedContacts: {
    email: string[];
    phoneNumber: string[];
    whatsApp: string[];
    telegramNickname: string[];
    telegramId: string[];
    telegramPhoneNumber: string[];
    vKontakte: string[];
    instagram: string[];
    facebook: string[];
    otherContact: string[];
  };
}
