import { Component, inject } from '@angular/core';
import { ToponymsListComponent } from '../../shared/toponyms-list/toponyms-list.component';
import { ToponymProps } from '../../interfaces/toponym-props';
import { ActivatedRoute } from '@angular/router';
import { GeographyLevels } from '../../interfaces/types';

@Component({
  selector: 'app-districts-list',
  imports: [ToponymsListComponent],
  templateUrl: './districts-list.component.html',
  styleUrl: './districts-list.component.css',
})
export class DistrictsListComponent {
  private route = inject(ActivatedRoute);
  type: GeographyLevels = 'district';
  props: ToponymProps = {
    title: 'Районы/округа',
    displayedColumns: [
      'name',
      'shortName',
      'postName',
      'shortPostName',
      'region',
      'country',
      'actions',
    ],
    filename: 'шаблон-районы-округа.xlsx',
    isShowCountry: true,
    isShowRegion: true,
    isShowDistrict: true,
    isShowLocality: false,
    defaultCountryId: 143,
    defaultRegionId: null,
    defaultDistrictId: null,
    defaultLocalityId: null,
    creationTitle: 'Новый р-н/округ',
    viewTitle: 'Район/округ',
    searchPlaceHolder: 'Белогорский',
    namePlaceHolder: 'Диксонский район',
    shortNamePlaceHolder: 'Диксонский р-н',
    postNamePlaceHolder: 'Диксонский район',
    shortPostNamePlaceHolder: 'Диксонский р-н',
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
    });
  }
}
