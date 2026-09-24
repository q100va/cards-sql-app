function buildKey(...values) {
  return values
    .map((value) => value ?? '')
    .join('|');
}

export function compareSeniorLists(newList, oldList, homeId, commentsMode) {

  for (const newSenior of newList) {
    newSenior.dateOfExit = null;
    newSenior.homeId = homeId;
    const fields = [
      'dateOfConsent', 'comment', 'infoNote', 'photoLink',
      'kindergarten', 'teacher', 'veteran', 'childOfWar', 'profession', 'honoraryStatus',
      'interests', 'orthodoxBeliever'
    ];

    for (const field of fields) {
      newSenior[field] = newSenior[field] ?? null;
    }
  }

  newList.sort(
    (prev, next) => {
      if (prev.lastName < next.lastName) return -1;
      if (prev.lastName > next.lastName) return 1;
    }
  );
  oldList.sort(
    (prev, next) => {
      if (prev.lastName < next.lastName) return -1;
      if (prev.lastName > next.lastName) return 1;
    });

  let newSeniors = [];
  let removedSeniors = [];
  let updatedSeniors = [];
  let possibleDuplicates = [];
  let returnedSeniors = [];

  const foundIds = [];

  for (const newSenior of newList) {

    const key1 = buildKey(
      newSenior.lastName,
      newSenior.firstName,
      newSenior.patronymic,
      newSenior.birthDate,
    );
    const index1 = oldList.findIndex(
      (item) =>
        buildKey(
          item.lastName,
          item.firstName,
          item.patronymic,
          item.birthDate,
        ) === key1,
    );
    if (index1 !== -1) {
      if (oldList[index1].dateOfExit) {
        const changes = compareData(newSenior, oldList[index1], commentsMode);
        returnedSeniors.push({
          newSenior: newSenior,
          oldSenior: oldList[index1],
          changes,
          changeRows: getChangeRows(changes)
        });
      } else {
        const changes = compareData(newSenior, oldList[index1], commentsMode);
        if (Object.entries(changes).length > 0) {
          updatedSeniors.push({
            newSenior: newSenior,
            oldSenior: oldList[index1],
            changes,
            changeRows: getChangeRows(changes)
          });
        }
      }
      foundIds.push(oldList[index1].id);
      continue;
    }

    const key2 = buildKey(
      newSenior.firstName,
      newSenior.patronymic,
      newSenior.birthDate,
    );

    let index2 = oldList.findIndex(
      (item) =>
        buildKey(
          item.firstName,
          item.patronymic,
          item.birthDate,
        ) === key2,
    );

    if (index2 === -1) {
      const key3 = buildKey(
        newSenior.lastName,
        newSenior.firstName,
        newSenior.patronymic,
      );

      index2 = oldList.findIndex(
        (item) =>
          buildKey(
            item.lastName,
            item.firstName,
            item.patronymic,
          ) === key3,
      );

      if (index2 === -1) {
        const key4 = buildKey(
          newSenior.lastName,
          newSenior.patronymic,
          newSenior.birthDate,
        );

        index2 = oldList.findIndex(
          (item) =>
            buildKey(
              item.lastName,
              item.patronymic,
              item.birthDate,
            ) === key4,
        );

        if (index2 === -1) {
          const key5 = buildKey(
            newSenior.lastName,
            newSenior.firstName,
            newSenior.birthDate,
          );

          index2 = oldList.findIndex(
            (item) =>
              buildKey(
                item.lastName,
                item.firstName,
                item.birthDate,
              ) === key5,
          );
        }
      }
    }

    if (index2 === -1) {
      newSeniors.push(newSenior);
    } else {
      const changes = compareData(newSenior, oldList[index2], commentsMode);
      possibleDuplicates.push({
        newSenior: newSenior,
        oldSenior: oldList[index2],
        changes,
        changeRows: getChangeRows(changes)
      });
      foundIds.push(oldList[index2].id);
    }
  }

  const idSet = new Set(foundIds);
  removedSeniors = oldList
    .filter(item => !idSet.has(item.id))
    .filter(item => item.dateOfExit === null);

  return { newSeniors, removedSeniors, updatedSeniors, possibleDuplicates, returnedSeniors };

}

function compareData(newData, oldData, commentsMode) {
  const changes = {};
  const mainFields = [
    'lastName', 'firstName', 'patronymic', 'gender', 'birthDate', 'dateOfExit'
  ];
  for (const field of mainFields) {
    const newValue = newData[field] ?? null;
    const oldValue = oldData[field] ?? null;
    if (newValue !== oldValue) {
      changes[field] = { newValue, oldValue };
    }
  }

  const otherFields = [
    'dateOfConsent', 'comment', 'infoNote', 'photoLink',
    'kindergarten', 'teacher', 'veteran', 'childOfWar', 'profession', 'honoraryStatus',
    'interests', 'orthodoxBeliever'
  ];
  for (const field of otherFields) {
    const newValue = newData[field] ?? null;
    const oldValue = oldData[field] ?? null;

    if (commentsMode && newValue === null) continue;
    if (newValue !== oldValue) {
      changes[field] = { newValue, oldValue };
    }

  }
  return changes;
}

function getChangeRows(changes) {
  return Object.entries(changes).map(([field, change]) => ({
    field: field,
    label: field,
    newValue: change?.newValue ?? null,
    oldValue: change?.oldValue ?? null,
  }));
}
