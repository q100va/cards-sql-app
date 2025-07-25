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

};
