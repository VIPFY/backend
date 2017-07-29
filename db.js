var faker = require('faker');
var _ = require('lodash');

module.exports = () => {
  const data = { users: [] }
  const { name, address, finance, company, lorem, image, phone, internet } = faker;
  const bool = faker.random.boolean();
  const randomNumber = faker.random.number();

  const payingOptions = ['VISA', 'MASTERCARD', 'PAYPAL', 'BANK']
  const payingOption = () => _.nth(payingOptions, _.random(0, 3));

  const gender = ['male', 'female', 'n/a'];
  const selectGender = () => _.nth(gender, _.random(0,2));

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
        ordernumber: randomNumber
      }
    })
  );

  for (let i = 1; i < _.random(40, 50); i++) {
    data.users.push({
      id: `${i}`,
      firstName: name.firstName(),
      lastName: name.lastName(),
      referral: bool,
      position: name.jobTitle(),
      email: faker.internet.email(),
      title: name.title(),
      livingaddress: generateAddress(1, 2),
      payingaddress: generateAddress(1, 3),
      deliveryaddress: fillArray(1, 3, () => {
        return {
          country: address.countryCode(),
          street: address.streetName(),
          number: randomNumber,
          zip: address.zipCode(),
          city: address.city(),
          ordernumber: randomNumber,
          normaltime: {
            from: `${_.random(8, 12)}:${_.random(1, 5)}0`,
            to: `${_.random(13, 19)}:${_.random(1, 5)}0`
          }
        }
      }),
      payingoption: fillArray(1, 5, () => {
        return {
          type: payingOption(),
          number: finance.iban(),
          name: `${name.firstName()} ${name.lastName()}`,
          limit: finance.amount(),
          ordernumber: randomNumber
        }
      }),
      birthday: {
        day: _.random(1, 28),
        month: _.random(1, 12),
        year: _.random(1950, 1994)
      },
      sex: selectGender(),
      profilepicture: faker.image.image(),
      nationality: fillArray(1, 2, () => address.country()),
      companyname: company.companyName(),
      companylogo: image.business(),
      companylegalform: company.companySuffix(),
      companyaddress: generateAddress(1, 5),
      companypayingaddress: generateAddress(1, 5),
      companydeliveryaddress: generateAddress(1, 5),
      companypayingoption: fillArray(1, 5, () => {
        return {
          type: payingOption(),
          number: finance.iban(),
          name: `${name.firstName()} ${name.lastName()}`,
          limit: finance.amount(),
          ordernumber: randomNumber
        }
      }),
      yearsincompany: _.random(1, 40),
      position: fillArray(1, 5, () => name.title()),
      department: fillArray(1, 5, () => name.jobArea()),
      admin: bool,
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
      phonenumber: fillArray(1, 4, () => phone.phoneNumber()),
      recoveryemail: internet.email(),
      // // websites[],
      // // languages [],
      // // tollskills [],
      // // certificates [],
      // // socialprofiles [{site, link}],
      // // accessgroups [],
      // // additionalcompanyapps [],
      // // additionalpersonalapps: [ type: GraphQLString ],
      // // rights [{key, value}],
      // // personalbillhistory [],
      // // companybillhistory [],
      // // recoveryoptioncompany [], //was erlaubt ist
      // recoveryoptionpersonal: { type: GraphQLString }  //was gewählt wurde
    })
  }
  return data
}
