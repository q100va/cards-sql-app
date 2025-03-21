const namesOfAddressTypes = {
  districts: [
    {
      name: "городской округ город-курорт",
      shortName: "г.о. город-курорт",
      re: /городской округ город-курорт/i
    },
    {
      name: "городской округ город",
      shortName: "г.о. город",
      re: /городской округ город/i
    },
    {
      name: "городской округ",
      shortName: "г.о.",
      re: /городской округ/i
    },
    {
      name: "муниципальный район",
      shortName: "м.р-н",
      re: /муниципальный район/i
    },
    {
      name: "район",
      shortName: "р-н",
      re: /район/i
    },
    {
      name: "муниципальный округ",
      shortName: "м.о.",
      re: /муниципальный округ/i
    },
    {
      name: "муниципальное образование город",
      shortName: "м.о. город",
      re: /муниципальное образование город/i
    },
    {
      name: "муниципальное образование",
      shortName: "м.о.",
      re: /муниципальное образование/i
    },
    {
      name: "город",
      shortName: "г.",
      re: /город/i
    },
  ],
  localities: [
    {
      name: "город",
      shortName: "г.",
      re: /город/i
    },
    {
      name: "деревня",
      shortName: "д.",
      re: /деревня/i
    },
    {
      name: "село",
      shortName: "с.",
      re: /село/i
    },
    {
      name: "пгт",
      shortName: "пгт",
      re: /пгт/i
    },
    {
      name: "рабочий поселок",
      shortName: "рп",
      re: /рабочий поселок/i
    },
    {
      name: "дачный поселок",
      shortName: "дп",
      re: /дачный поселок/i
    },
    {
      name: "поселок станции",
      shortName: "п.ст.",
      re: /поселок станции/i
    },
    {
      name: "курортный поселок",
      shortName: "кп",
      re: /курортный поселок/i
    },
    {
      name: "поселок",
      shortName: "п.",
      re: /поселок/i
    },
    {
      name: "хутор",
      shortName: "х.",
      re: /хутор/i
    },
    {
      name: "слобода",
      shortName: "сл.",
      re: /слобода/i
    },
    {
      name: "слободка",
      shortName: "сл.",
      re: /слободка/i
    },
    {
      name: "местечко",
      shortName: "м.",
      re: /местечко/i
    },
    {
      name: "аул",
      shortName: "аул",
      re: /аул/i
    },

    {
      name: "станица",
      shortName: "ст-ца",
      re: /станица/i
    },
    {
      name: "поселок ж.д. станции",
      shortName: "п. ж/д ст.",
      re: /поселок ж.д. станции/i
    },
    {
      name: "поселок ж.д. разъезда",
      shortName: "п. ж/д рзд.",
      re: /поселок ж.д. разъезда/i
    },
    {
      name: "разъезд",
      shortName: "рзд",
      re: /разъезд/i
    },
    {
      name: "станция",
      shortName: "ст.",
      re: /станция/i
    },


  ]
};

/*
Поселок ж/д разъезда	7
/*
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

export function correctDistrictName(rowName, rowPostName, rowPostNameType) {
  rowPostName = rowPostName || null;
  rowPostNameType = rowPostNameType || null;
  const addressTypes = namesOfAddressTypes.districts;
  let name, shortName, postName, shortPostName;
  for (let type of addressTypes) {
    if (rowName.toLowerCase().includes(type.name)) {
      name = rowName.replace(type.re, "").trim() + " " + type.name;
      shortName = rowName.replace(type.re, type.shortName);
      break;
    }
  }
  console.log("name");
  console.log(name);
  console.log("shortName");
  console.log(shortName);
  if (!name || !shortName) {
    throw new Error(`Отсутствующий или неверный тип региона в названии "${rowName}"! Ввод прекращен.`);
  }
  let postData;

  if (rowPostName && rowPostNameType) {
    try {
      if (rowPostNameType == "район") {
        postData = correctDistrictName(rowName);
      } else {
        postData = correctLocalityName(rowPostName, rowPostNameType);
      }
      postName = postData.name;
      shortPostName = postData.shortName;
    } catch (e) {
      throw e;
    }
  }
  return {
    name: name,
    shortName: shortName,
    postName: postName,
    shortPostName: shortPostName,
  }
}

export function correctLocalityName(rowName, type, district) {
  district = district || null;
  console.log("rowName, type, district");
  console.log(rowName, type, district);
  const addressType = namesOfAddressTypes.localities.find(item => item.name == type.toLowerCase());
  if (!addressType) throw new Error(`Отсутствующий или неверный тип населенного пункта в названии "${rowName} ${type}"! Ввод прекращен.`);
  let districtData;
  if (district) {
    try {
      districtData = correctDistrictName(district).name;
    } catch (e) {
      throw e;
    }
  }

  let name = rowName.trim() + " " + addressType.name;
  let shortName = addressType.shortName + " " + rowName.trim();

  console.log("name");
  console.log(name);
  console.log("shortName");
  console.log(shortName);

  return {
    name: name,
    shortName: shortName,
    districtFullName: districtData
  }

};
