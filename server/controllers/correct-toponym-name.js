import CustomError from "../shared/customError.js";

const ADDRESS_TYPES = {
  districts: [
    {
      name: "городской округ город-курорт",
      shortName: "г.о. город-курорт",
      re: /городской округ город-курорт/i,
    },
    {
      name: "городской округ город",
      shortName: "г.о. город",
      re: /городской округ город/i,
    },
    {
      name: "городской округ",
      shortName: "г.о.",
      re: /городской округ/i,
    },
    {
      name: "муниципальный район",
      shortName: "м.р-н",
      re: /муниципальный район/i,
    },
    {
      name: "район",
      shortName: "р-н",
      re: /район/i,
    },
    {
      name: "муниципальный округ",
      shortName: "м.о.",
      re: /муниципальный округ/i,
    },
    {
      name: "муниципальное образование город",
      shortName: "м.о. город",
      re: /муниципальное образование город/i,
    },
    {
      name: "муниципальное образование",
      shortName: "м.о.",
      re: /муниципальное образование/i,
    },
    {
      name: "город",
      shortName: "г.",
      re: /город/i,
    },
  ],

  localities: [
    {
      name: "город",
      shortName: "г.",
    },
    {
      name: "деревня",
      shortName: "д.",
    },
    {
      name: "село",
      shortName: "с.",
    },
    {
      name: "пгт",
      shortName: "пгт",
    },
    {
      name: "рабочий поселок",
      shortName: "рп",
    },
    {
      name: "дачный поселок",
      shortName: "дп",
    },
    {
      name: "поселок станции",
      shortName: "п.ст.",
    },
    {
      name: "курортный поселок",
      shortName: "кп",
    },
    {
      name: "поселок",
      shortName: "п.",
    },
    {
      name: "хутор",
      shortName: "х.",
    },
    {
      name: "слобода",
      shortName: "сл.",
    },
    {
      name: "слободка",
      shortName: "сл.",
    },
    {
      name: "местечко",
      shortName: "м.",
    },
    {
      name: "аул",
      shortName: "аул",
    },
    {
      name: "станица",
      shortName: "ст-ца",
    },
    {
      name: "поселок ж.д. станции",
      shortName: "п. ж/д ст.",
    },
    {
      name: "поселок ж.д. разъезда",
      shortName: "п. ж/д рзд.",
    },
    {
      name: "разъезд",
      shortName: "рзд",
    },
    {
      name: "станция",
      shortName: "ст.",
    },
  ],
};

function normalizeName(value) {
  return value
    ?.replaceAll("ё", "е")
    .replaceAll("Ё", "Е")
    .trim();
}

function normalizeType(value) {
  return normalizeName(value)
    ?.toLowerCase();
}

export function correctCountryName(rowName) {
  return {
    name: normalizeName(rowName),
  };
}

export function correctRegionName(
  rowName,
  rowShortName,
) {
  return {
    name: normalizeName(rowName),
    shortName: normalizeName(rowShortName),
  };
}

export function correctDistrictName(
  rowName,
  rowPostName = null,
  rowPostNameType = null,
) {
  const normalizedName =
    normalizeName(rowName);

  const normalizedPostName =
    normalizeName(rowPostName);

  const normalizedPostNameType =
    normalizeType(rowPostNameType);

  const addressTypes =
    ADDRESS_TYPES.districts;

  let name;
  let shortName;

  for (const addressType of addressTypes) {
    if (
      normalizedName
        .toLowerCase()
        .includes(addressType.name)
    ) {
      name =
        `${normalizedName
          .replace(addressType.re, "")
          .trim()} ${addressType.name}`;

      shortName =
        normalizedName.replace(
          addressType.re,
          addressType.shortName,
        );

      break;
    }
  }

  if (!name || !shortName) {
    throw new CustomError(
      'ERRORS.TOPONYM.INVALID_TYPE',
      422,
      {
        name: normalizedName,
      },
    );
  }

  let postName;
  let shortPostName;

  if (
    normalizedPostName &&
    normalizedPostNameType
  ) {
    const postData =
      normalizedPostNameType === "район"
        ? correctDistrictName(
            normalizedName,
          )
        : correctLocalityName(
            normalizedPostName,
            normalizedPostNameType,
          );

    postName =
      postData.name;

    shortPostName =
      postData.shortName;
  }

  return {
    name,
    shortName,
    postName,
    shortPostName,
  };
}

export function correctLocalityName(
  rowName,
  type,
  district = null,
) {
  const normalizedName =
    normalizeName(rowName);

  let normalizedType =
    normalizeType(type);

  if (
    normalizedType ===
      "поселок городского типа" ||
    normalizedType ===
      "пгт (рабочий поселок)"
  ) {
    normalizedType = "пгт";
  }

  const addressType =
    ADDRESS_TYPES.localities.find(
      (item) =>
        item.name === normalizedType,
    );

  if (!addressType) {
    throw new CustomError(
      'ERRORS.TOPONYM.INVALID_TYPE',
      422,
      {
        name:
          `${normalizedName} ${normalizedType}`,
      },
    );
  }

  const districtFullName =
    district
      ? correctDistrictName(
          district,
        ).name
      : null;

  return {
    name:
      `${normalizedName} ${addressType.name}`,

    shortName:
      `${addressType.shortName} ${normalizedName}`,

    districtFullName,
  };
}

/**************************************************************/

/*
п. ж/д рзд. - поселок ж/д разъезда
г. — город;
пгт — посёлок городского типа;
рп — рабочий посёлок;
кп — курортный посёлок;
к. — кишлак;
дп — дачный посёлок (дачный поселковый совет);
п. — посёлок сельского типа;
нп — населённый пункт;
п.ст. — посёлок при станции (посёлок станции);
ж/д ст. — железнодорожная станция;
ж/д будка — железнодорожная будка;
ж/д казарма — железнодорожная казарма;
ж/д платформа — железнодорожная платформа;
ж/д рзд — железнодорожный разъезд;
ж/д остановочный пункт — железнодорожный остановочный пункт;
ж/д путевой пост — железнодорожный путевой пост;
ж/д блокпост — железнодорожный блокпост;
с. — село;
м. — местечко;
д. — деревня;
сл. — слобода;
ст. — станция;
ст-ца — станица;
х. — хутор;
у. — улус;
рзд — разъезд;
клх — колхоз (коллективное хозяйство);
свх — совхоз (советское хозяйство);*/
