export interface User {
  id: number | null;
  userName: string;
  password: string;
  firstName: string;
  patronymic: string | null;
  lastName: string;
  roleId: number ;
  //roleName?: {name: string};
  role:{name: string};
  addresses:
  {
    country: {id: number ; name: string} | null;
    region: {id: number ; name: string} | null;
    district: {id: number ; name: string} | null;
    locality: {id: number ; name: string} | null;
    isRestricted?: boolean;
    id?: number;
  } [];
  draftAddresses?: {
    country: number | null;
    region: number | null;
    district: number | null;
    locality: number | null;
  } [];
  comment: string;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  contacts?: { id: number; type: string; content: string, isRestricted?: boolean }[];
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
  outdatedNames: {firstName: string | null; patronymic: string | null; lastName: string | null; userName: string | null;  id?: number;} [] |[];
  outdatedData: OutdatedData;

}

export interface OutdatedData {
  contacts: {
    [key: string]: {id: number, content: string}[];
  };
  addresses:
  {
    country: {id: number ; name: string} | null;
    region: {id: number ; name: string} | null;
    district: {id: number ; name: string} | null;
    locality: {id: number ; name: string} | null;
    isRestricted?: boolean;
    id: number;
  } [];
  names: {firstName: string | null; patronymic: string | null; lastName: string | null; userName: string | null;} [];
}


