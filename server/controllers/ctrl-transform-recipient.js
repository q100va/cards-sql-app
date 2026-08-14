export function transformRecipient(recipient) {
  return {
    id: recipient.id,
    fullName: recipient.fullNameSnapshot,
    birthDay: recipient.daySnapshot,
    birthMonth: recipient.monthSnapshot,
    birthYear: recipient.yearSnapshot,
    category: recipient.category,
    acceptableForSchool: recipient.acceptableForSchool,
    regionName: recipient.snapshotRegion.name,
    homeName: recipient.snapshotHome.homeName,
    plusAmount: recipient.plusAmount,
    specialComment: recipient.specialComment,
    isAbsent: recipient.isAbsent,
  };
}
