export default (sequelize, { STRING, DATE, INTEGER, JSONB, ARRAY, TEXT, BOOLEAN, ENUM }) => {
  const User = sequelize.define("users_view", {
    firstname: { type: STRING, defaultValue: "not specified yet" },
    middlename: STRING,
    lastname: { type: STRING, defaultValue: "not specified yet" },
    title: STRING,
    sex: ENUM("m", "w", "u"),
    birthday: DATE,
    resetoption: INTEGER,
    language: TEXT,
    banned: { type: BOOLEAN, defaultValue: false },
    deleted: { type: BOOLEAN, defaultValue: false },
    suspended: { type: BOOLEAN, defaultValue: false },
    profilepicture: TEXT,
    riskvalue: INTEGER,
    createdate: DATE,
    payingoptions: JSONB,
    position: TEXT,
    emails: { type: ARRAY(TEXT), allowNull: false }
  });

  return User;
};
