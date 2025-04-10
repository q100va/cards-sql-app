import { DefaultAddressParams } from './default-address-params';
import { Control } from './toponym-props';
import { GeographyLevels } from './types';

export interface DialogData {
  type: GeographyLevels;
  operation: 'create' | 'view-edit';
  defaultAddressParams: DefaultAddressParams;
  toponym?: {
    [key: string]: string | number | boolean;
  };
  isShowCountry: boolean;
  isShowRegion: boolean;
  isShowDistrict: boolean;
  isShowLocality: boolean;
  specialField: string;
  creationTitle: string;
  viewTitle: string;
  placeHolders: {
    [key: string]: string;
  };
  controls: Control[];
  checkingName: string;
  addressFilterControls?: {
    addressFilterProp: string;
    toponymProp: string;
  }[];
}
