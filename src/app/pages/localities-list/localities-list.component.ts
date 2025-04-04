import { Component, inject } from '@angular/core';
import { ToponymsListComponent } from '../../shared/toponyms-list/toponyms-list.component';
import { ToponymProps } from '../../interfaces/toponym-props';
import { ActivatedRoute } from '@angular/router';
import { GeographyLevels } from '../../interfaces/types';

@Component({
  selector: 'app-localities-list',
  imports: [ToponymsListComponent],
  templateUrl: './localities-list.component.html',
  styleUrl: './localities-list.component.css',
})
export class LocalitiesListComponent {
  private route = inject(ActivatedRoute);
  type: GeographyLevels = 'locality';
  props: ToponymProps = {
    title: 'Населенные пункты',
    displayedColumns: [
      'name',
      'shortName',
      'district',
      'region',
      'country',
      'actions',
    ],
    isShowCountry: true,
    isShowRegion: true,
    isShowDistrict: true,
    isShowLocality: true,
    defaultCountryId: 143,
    defaultRegionId: null,
    defaultDistrictId: null,
    defaultLocalityId: null,
    filename: 'шаблон-населенные-пункты.xlsx',
    creationTitle: 'Новый насел. пункт',
    viewTitle: 'Населенный пункт',
    searchPlaceHolder: 'Лихоборы или Малаховка Московская',
    namePlaceHolder: 'Синицыно поселок',
    shortNamePlaceHolder: 'п. Синицыно',
    postNamePlaceHolder: '',
    shortPostNamePlaceHolder: '',
  };

  constructor() {
    this.route.queryParams.subscribe((params) => {
      this.props.defaultCountryId = params['countryId']
        ? params['countryId']
        : this.props.defaultCountryId;
      this.props.defaultRegionId = params['regionId']
        ? params['regionId']
        : this.props.defaultRegionId;
      this.props.defaultDistrictId = params['districtId']
        ? params['districtId']
        : this.props.defaultDistrictId;
              this.props.defaultLocalityId = params['localityId']
        ? params['localityId']
        : this.props.defaultLocalityId;
    });
  }
}
