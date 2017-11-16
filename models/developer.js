export default (sequelize, { INTEGER, STRING }) => {
  const Developer = sequelize.define("developer", {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
      unique: true
    },
    name: {
      type: STRING
    },
    website: {
      type: STRING
    },
    legalwebsite: {
      type: STRING
    },
    bankaccount: {
      type: STRING
    }
  });

  return Developer;
};
