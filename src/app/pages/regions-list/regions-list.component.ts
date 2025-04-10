import { Component, inject } from '@angular/core';
import { ToponymsListComponent } from '../../shared/toponyms-list/toponyms-list.component';
import { ToponymProps } from '../../interfaces/toponym-props';
import { ActivatedRoute } from '@angular/router';
import { GeographyLevels } from '../../interfaces/types';
import { DefaultAddressParams } from '../../interfaces/default-address-params';
import { Validators } from '@angular/forms';

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
    queryParams: null,
    filename: 'шаблон-регионы.xlsx',
    searchPlaceHolder: 'Тульская',
    dialogProps: {
      creationTitle: 'Новый регион',
      viewTitle: 'Регион',
      placeHolders: {
        namePlaceHolder: 'Читинская область',
        shortNamePlaceHolder: 'Читинская обл.',
      },
      controls: [
        {
          controlName: 'name',
          value: '',
          disabled: true,
          validators: [Validators.required],
        },
        {
          controlName: 'shortName',
          value: '',
          disabled: true,
          validators: [Validators.required],
        },
      ],
      checkingName: 'name',
      addressFilterControls: [
        {
          addressFilterProp: 'countries',
          toponymProp: 'country.id',
        },
      ],
    },
  };

  constructor() {
    this.route.queryParams.subscribe((params) => {
      this.props.queryParams = params as DefaultAddressParams | null;
    });
  }
}
