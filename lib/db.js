'use strict';

var _faker = require('faker');

var _faker2 = _interopRequireDefault(_faker);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

module.exports = function () {
  var data = { users: [] };
  var name = _faker2.default.name,
      address = _faker2.default.address,
      finance = _faker2.default.finance,
      random = _faker2.default.random,
      commerce = _faker2.default.commerce,
      company = _faker2.default.company,
      lorem = _faker2.default.lorem,
      image = _faker2.default.image,
      phone = _faker2.default.phone,
      internet = _faker2.default.internet;

  var randomNumber = _faker2.default.random.number();

  var payingOptions = ['VISA', 'MASTERCARD', 'PAYPAL', 'BANK'];
  var payingOption = function payingOption() {
    return _lodash2.default.nth(payingOptions, _lodash2.default.random(0, 3));
  };

  var gender = ['male', 'female', 'n/a'];
  var selectGender = function selectGender() {
    return _lodash2.default.nth(gender, _lodash2.default.random(0, 2));
  };

  var recoveryOptions = ['email', 'phone', 'passphrase'];
  var recoveryOption = function recoveryOption() {
    return _lodash2.default.nth(recoveryOptions, _lodash2.default.random(0, 2));
  };

  var fillArray = function fillArray(start, end, callback) {
    return _lodash2.default.times(_lodash2.default.random(start, end), callback);
  };

  var generateAddress = function generateAddress(start, end) {
    return _lodash2.default.times(_lodash2.default.random(start, end), function () {
      return {
        country: address.countryCode(),
        street: address.streetName(),
        number: randomNumber,
        zip: address.zipCode(),
        city: address.city(),
        orderNumber: randomNumber
      };
    });
  };

  for (var i = 1; i < _lodash2.default.random(40, 50); i++) {
    var _data$users$push;

    data.users.push((_data$users$push = {
      id: '' + i,
      firstName: name.firstName(),
      lastName: name.lastName(),
      referral: random.boolean(),
      position: name.jobTitle(),
      email: _faker2.default.internet.email(),
      title: name.title(),
      livingAddress: generateAddress(1, 2),
      payingAddress: generateAddress(1, 3),
      deliveryAddress: fillArray(1, 3, function () {
        return {
          country: address.countryCode(),
          street: address.streetName(),
          number: randomNumber,
          zip: address.zipCode(),
          city: address.city(),
          orderNumber: randomNumber,
          normalTime: {
            from: _lodash2.default.random(8, 12) + ':' + _lodash2.default.random(1, 5) + '0',
            to: _lodash2.default.random(13, 19) + ':' + _lodash2.default.random(1, 5) + '0'
          }
        };
      }),
      payingOption: fillArray(1, 5, function () {
        return {
          type: payingOption(),
          number: finance.iban(),
          name: name.firstName() + ' ' + name.lastName(),
          limit: finance.amount(),
          orderNumber: randomNumber
        };
      }),
      birthday: {
        day: _lodash2.default.random(1, 28),
        month: _lodash2.default.random(1, 12),
        year: _lodash2.default.random(1950, 1994)
      },
      sex: selectGender(),
      profilePicture: _faker2.default.image.image(),
      nationality: fillArray(1, 2, function () {
        return address.country();
      }),
      companyName: company.companyName(),
      companyLogo: image.business(),
      companyLegalform: company.companySuffix(),
      companyAddress: generateAddress(1, 5),
      companyPayingAddress: generateAddress(1, 5),
      companyDeliveryAddress: generateAddress(1, 5),
      companyPayingOption: fillArray(1, 5, function () {
        return {
          type: payingOption(),
          number: finance.iban(),
          name: name.firstName() + ' ' + name.lastName(),
          limit: finance.amount(),
          orderNumber: randomNumber
        };
      }),
      yearsInCompany: _lodash2.default.random(1, 40)
    }, _defineProperty(_data$users$push, 'position', fillArray(1, 5, function () {
      return name.title();
    })), _defineProperty(_data$users$push, 'department', fillArray(1, 5, function () {
      return name.jobArea();
    })), _defineProperty(_data$users$push, 'admin', random.boolean()), _defineProperty(_data$users$push, 'salary', finance.amount()), _defineProperty(_data$users$push, 'likes', fillArray(0, 10, function () {
      return {
        key: lorem.word(),
        value: _lodash2.default.random(0, 500)
      };
    })), _defineProperty(_data$users$push, 'dislikes', fillArray(0, 10, function () {
      return {
        key: lorem.word(),
        value: _lodash2.default.random(0, 500)
      };
    })), _defineProperty(_data$users$push, 'notifications', fillArray(0, 10, function () {
      return {
        type: lorem.word(),
        text: lorem.text()
      };
    })), _defineProperty(_data$users$push, 'phoneNumber', fillArray(1, 4, function () {
      return phone.phoneNumber();
    })), _defineProperty(_data$users$push, 'recoveryEmail', internet.email()), _defineProperty(_data$users$push, 'websites', fillArray(0, 4, function () {
      return internet.domainName();
    })), _defineProperty(_data$users$push, 'languages', fillArray(1, 5, function () {
      return address.countryCode();
    })), _defineProperty(_data$users$push, 'certificates', fillArray(0, 5, function () {
      return company.bsAdjective();
    })), _defineProperty(_data$users$push, 'socialProfiles', fillArray(0, 4, function () {
      return {
        site: internet.domainWord(),
        link: internet.domainName()
      };
    })), _defineProperty(_data$users$push, 'accessGroups', fillArray(0, 5, function () {
      return commerce.department();
    })), _defineProperty(_data$users$push, 'permissions', fillArray(0, 15, function () {
      return {
        value: _lodash2.default.random(1, 4),
        company: company.companyName()
      };
    })), _defineProperty(_data$users$push, 'companyApps', fillArray(0, 20, function () {
      return commerce.productName();
    })), _defineProperty(_data$users$push, 'personalApps', fillArray(0, 20, function () {
      return commerce.productName();
    })), _defineProperty(_data$users$push, 'personalBillHistory', fillArray(0, 20, function () {
      return finance.amount();
    })), _defineProperty(_data$users$push, 'companybillhistory', fillArray(0, 20, function () {
      return finance.amount();
    })), _defineProperty(_data$users$push, 'recoveryOptionCompany', fillArray(0, 3, function () {
      return recoveryOption();
    })), _defineProperty(_data$users$push, 'recoveryOptionPersonal', fillArray(0, 3, function () {
      return recoveryOption();
    })), _data$users$push));
  }
  return data;
};
//# sourceMappingURL=db.js.map