//schemas to upload lists of toponyms
export const schemas = {
  country: {
    name: {
      prop: 'name',
      type: String,
      required: true,
    },
  },
  region: {
    name: {
      prop: 'name',
      type: String,
      required: true,
    },
    shortName: {
      prop: 'shortName',
      type: String,
      required: true,
    },
    country: {
      prop: 'country',
      type: String,
      required: true,
    },
  },
  district: {
    name: {
      prop: 'name',
      type: String,
      required: true,
    },
    postName: {
      prop: 'postName',
      type: String,
      required: true,
    },
    postNameType: {
      prop: 'postNameType',
      type: String,
      required: true,
    },
    region: {
      prop: 'region',
      type: String,
      required: true,
    },
  },
  locality: {
    name: {
      prop: 'name',
      type: String,
      required: true,
    },
    type: {
      prop: 'type',
      type: String,
      required: true,
    },
    district: {
      prop: 'district',
      type: String,
      required: true,
    },
    isCapitalOfDistrict: {
      prop: 'isCapitalOfDistrict',
      type: Boolean,
      required: true,
    },
    isCapitalOfRegion: {
      prop: 'isCapitalOfRegion',
      type: Boolean,
      required: true,
    },
    isFederalCity: {
      prop: 'isFederalCity',
      type: Boolean,
      required: true,
    },
    region: {
      prop: 'region',
      type: String,
      required: true,
    },
  },

  seniors: {
    nursingHome: {
      prop: 'nursingHome',
      type: String,
      required: true,
    },
    lastName: {
      prop: 'lastName',
      type: String,
      required: false,
    },
    firstName: {
      prop: 'firstName',
      type: String,
      required: true,
    },
    patronymic: {
      prop: 'patronymic',
      type: String,
      required: false,
    },
    dayBirthday: {
      prop: 'dayBirthday',
      type: Number,
      required: false,
    },
    monthBirthday: {
      prop: 'monthBirthday',
      type: Number,
      required: false,
    },
    yearBirthday: {
      prop: 'yearBirthday',
      type: Number,
      required: false,
    },
    dateOfConsent: {
      prop: 'dateOfConsent',
      type: String,
      required: false,
    },
    comment: {
      prop: 'comment',
      type: String,
      required: false,
    },
    infoNote: {
      prop: 'infoNote',
      type: String,
      required: false,
    },
    photoLink: {
      prop: 'photoLink',
      type: String,
      required: false,
    },
    kindergarten: {
      prop: 'kindergarten',
      type: String,
      required: false,
    },
    teacher: {
      prop: 'teacher',
      type: String,
      required: false,
    },
    veteran: {
      prop: 'veteran',
      type: String,
      required: false,
    },
    childOfWar: {
      prop: 'childOfWar',
      type: String,
      required: false,
    },
    profession: {
      prop: 'profession',
      type: String,
      required: false,
    },
    honoraryStatus: {
      prop: 'honoraryStatus',
      type: String,
      required: false,
    },
    interests: {
      prop: 'interests',
      type: String,
      required: false,
    },
    orthodoxBeliever: {
      prop: 'orthodoxBeliever',
      type: String,
      required: false,
    },
  },
};
