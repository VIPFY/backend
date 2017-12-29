export default (sequelize, { INTEGER, STRING }) => {
  const Developer = sequelize.define("developer", {
    name: STRING,
    website: {
      type: STRING,
      validate: {
        isUrl: true
      }
    },
    legalwebsite: {
      type: STRING,
      validate: {
        isUrl: true
      }
    },
    bankaccount: STRING
  });

  return Developer;
};
