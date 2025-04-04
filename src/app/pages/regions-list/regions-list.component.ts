import { Component, inject } from '@angular/core';
import { ToponymsListComponent } from '../../shared/toponyms-list/toponyms-list.component';
import { ToponymProps } from '../../interfaces/toponym-props';
import { ActivatedRoute } from '@angular/router';
import { GeographyLevels } from '../../interfaces/types';

@Component({
  selector: 'app-regions-list',
  imports: [ToponymsListComponent],
  templateUrl: './regions-list.component.html',
  styleUrl: './regions-list.component.css',
})
export class RegionsListComponent {
  private route = inject(ActivatedRoute);
  type: GeographyLevels = 'region';
  props: ToponymProps = {
    title: 'Регионы',
    displayedColumns: ['name', 'shortName', 'country', 'actions'],
    isShowCountry: true,
    isShowRegion: true,
    isShowDistrict: false,
    isShowLocality: false,
    defaultCountryId: 143,
    defaultRegionId: null,
    defaultDistrictId: null,
    defaultLocalityId: null,
    filename: 'шаблон-регионы.xlsx',
    creationTitle: 'Новый регион',
    viewTitle: 'Регион',
    searchPlaceHolder: 'Тульская',
    namePlaceHolder: 'Читинская область',
    shortNamePlaceHolder: 'Читинская обл.',
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
    });
  }
}
