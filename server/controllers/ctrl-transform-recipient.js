export function transformRecipient(recipient) {
 // console.log('RECIPIENT', recipient);
  return {
    id: recipient.id,
    fullName: recipient.fullNameSnapshot,
    birthDay: recipient.daySnapshot,
    birthMonth: recipient.monthSnapshot,
    birthYear: recipient.yearSnapshot,
    category: recipient.category,
    acceptableForSchool: recipient.acceptableForSchool,
    regionName: recipient.senior.home.activeAddress.region.name,
    homeName: recipient.senior.home.homeName,
    plusAmount: recipient.plusAmount,
    specialComment: recipient.specialComment,
    isAbsent: recipient.isAbsent,
  };
}
