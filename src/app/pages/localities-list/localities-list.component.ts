import { Component, inject } from '@angular/core';
import { ToponymsListComponent } from '../../shared/toponyms-list/toponyms-list.component';
import { ToponymProps } from '../../interfaces/toponym-props';
import { ActivatedRoute } from '@angular/router';
import { GeographyLevels } from '../../interfaces/types';
import { DefaultAddressParams } from '../../interfaces/default-address-params';
import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

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
    queryParams: null,
    searchPlaceHolder: 'Лихоборы или Малаховка Московская',
    filename: 'шаблон-населенные-пункты.xlsx',
    dialogProps: {
      creationTitle: 'Новый насел. пункт',
      viewTitle: 'Населенный пункт',
      controls: [
        {
          controlName: 'name',
          value: '',
          disabled: true,
          validators: [Validators.required],
          type: 'input',
          label: 'Название',
          placeHolder: 'Синицыно поселок',
        },
        {
          controlName: 'shortName',
          value: '',
          disabled: true,
          validators: [Validators.required],
          type: 'input',
          label: 'Краткое название',
          placeHolder: 'п. Синицыно',
        },
        {
          controlName: 'isFederalCity',
          value: false,
          disabled: true,
          type: 'checkbox',
          label: 'Федеральный город',
        },
        {
          controlName: 'isCapitalOfRegion',
          value: false,
          disabled: true,
          type: 'checkbox',
          label: 'Столица региона',
        },
        {
          controlName: 'isCapitalOfDistrict',
          value: false,
          disabled: true,
          type: 'checkbox',
          label: 'Столица округа',
        },
      ],
      checkingName: 'name',
      addressFilterControls: [
        {
          addressFilterProp: 'countries',
          toponymProp: 'district.region.country.id',
        },
        {
          addressFilterProp: 'regions',
          toponymProp: 'district.region.id',
        },
        {
          addressFilterProp: 'districts',
          toponymProp: 'district.id',
        },
      ],
      addressFilterParams: {
        type: this.type,
        isShowCountry: true,
        isShowRegion: true,
        isShowDistrict: true,
        isShowLocality: false,
      },
    },
  };

  constructor() {
    this.route.queryParams.subscribe((params) => {
      this.props.queryParams = params as DefaultAddressParams | null;
    });
  }
}
