import faker from 'faker';
import _ from 'lodash';

module.exports = () => {
  const data = { users: [] }
  const { name, address, finance, random, commerce, company, lorem, image, phone, internet } = faker;
  const randomNumber = faker.random.number();

  const payingOptions = ['VISA', 'MASTERCARD', 'PAYPAL', 'BANK']
  const payingOption = () => _.nth(payingOptions, _.random(0, 3));

  const gender = ['male', 'female', 'n/a'];
  const selectGender = () => _.nth(gender, _.random(0, 2));

  const recoveryOptions = ['email', 'phone', 'passphrase'];
  const recoveryOption = () => _.nth(recoveryOptions, _.random(0, 2));

  const fillArray = (start, end, callback) => (
    _.times(_.random(start, end), callback)
  );

  const generateAddress = (start, end) => (
    _.times(_.random(start, end), () => {
      return {
        country: address.countryCode(),
        street: address.streetName(),
        number: randomNumber,
        zip: address.zipCode(),
        city: address.city(),
        orderNumber: randomNumber
      }
    })
  );

  for (let i = 1; i < _.random(40, 50); i++) {
    data.users.push({
      id: `${i}`,
      firstName: name.firstName(),
      lastName: name.lastName(),
      referral: random.boolean(),
      position: name.jobTitle(),
      email: faker.internet.email(),
      title: name.title(),
      livingAddress: generateAddress(1, 2),
      payingAddress: generateAddress(1, 3),
      deliveryAddress: fillArray(1, 3, () => {
        return {
          country: address.countryCode(),
          street: address.streetName(),
          number: randomNumber,
          zip: address.zipCode(),
          city: address.city(),
          orderNumber: randomNumber,
          normalTime: {
            from: `${_.random(8, 12)}:${_.random(1, 5)}0`,
            to: `${_.random(13, 19)}:${_.random(1, 5)}0`
          }
        }
      }),
      payingOption: fillArray(1, 5, () => {
        return {
          type: payingOption(),
          number: finance.iban(),
          name: `${name.firstName()} ${name.lastName()}`,
          limit: finance.amount(),
          orderNumber: randomNumber
        }
      }),
      birthday: {
        day: _.random(1, 28),
        month: _.random(1, 12),
        year: _.random(1950, 1994)
      },
      sex: selectGender(),
      profilePicture: faker.image.image(),
      nationality: fillArray(1, 2, () => address.country()),
      companyName: company.companyName(),
      companyLogo: image.business(),
      companyLegalform: company.companySuffix(),
      companyAddress: generateAddress(1, 5),
      companyPayingAddress: generateAddress(1, 5),
      companyDeliveryAddress: generateAddress(1, 5),
      companyPayingOption: fillArray(1, 5, () => {
        return {
          type: payingOption(),
          number: finance.iban(),
          name: `${name.firstName()} ${name.lastName()}`,
          limit: finance.amount(),
          orderNumber: randomNumber
        }
      }),
      yearsInCompany: _.random(1, 40),
      position: fillArray(1, 5, () => name.title()),
      department: fillArray(1, 5, () => name.jobArea()),
      admin: random.boolean(),
      salary: finance.amount(),
      likes: fillArray(0, 10, () => {
        return {
          key: lorem.word(),
          value: _.random(0, 500)
        }
      }),
      dislikes: fillArray(0, 10, () => {
        return {
          key: lorem.word(),
          value: _.random(0, 500)
        }
      }),
      notifications: fillArray(0, 10, () => {
        return {
          type: lorem.word(),
          text: lorem.text()
        }
      }),
      phoneNumber: fillArray(1, 4, () => phone.phoneNumber()),
      recoveryEmail: internet.email(),
      websites: fillArray(0, 4, () => internet.domainName()),
      languages: fillArray(1, 5, () => address.countryCode()),
      // tollskills [],
      certificates: fillArray(0, 5, () => company.bsAdjective()),
      socialProfiles: fillArray(0, 4, () => {
        return {
          site: internet.domainWord(),
          link: internet.domainName()
        }
      }),
      accessGroups: fillArray(0, 5, () => commerce.department()),
      permissions: fillArray(0, 15, () => {
        return {
          value: _.random(1, 4),
          company: company.companyName()
        }
      }),
      companyApps: fillArray(0, 20, () => commerce.productName()),
      personalApps: fillArray(0, 20, () => commerce.productName()),
      personalBillHistory: fillArray(0, 20, () => finance.amount()),
      companybillhistory: fillArray(0, 20, () => finance.amount()),
      recoveryOptionCompany: fillArray(0, 3, () => recoveryOption()),
      recoveryOptionPersonal: fillArray(0, 3, () => recoveryOption())
    })
  }
  return data
}
