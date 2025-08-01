export interface UserDraft {
  id: number | null;
  userName: string;
  password: string;
  firstName: string;
  patronymic: string | null;
  lastName: string;
  roleId: number;
  //role: { name: string };

  draftAddress: {
    countryId: number | null;
    regionId: number | null;
    districtId: number | null;
    localityId: number | null;
  };
  comment: string | null;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  draftContacts: {
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
  }
}


