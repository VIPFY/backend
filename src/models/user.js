export default (
  sequelize,
  { STRING, DATE, DATEONLY, VIRTUAL, INTEGER, JSONB, TEXT, BOOLEAN, ENUM }
) => {
  const User = sequelize.define("users_view", {
    firstname: { type: STRING, defaultValue: "not specified yet" },
    middlename: STRING,
    lastname: { type: STRING, defaultValue: "not specified yet" },
    title: STRING,
    sex: ENUM("m", "w", "u"),
    birthday: DATEONLY,
    resetoption: INTEGER,
    language: TEXT,
    banned: { type: BOOLEAN, defaultValue: false },
    deleted: { type: BOOLEAN, defaultValue: false },
    suspended: { type: BOOLEAN, defaultValue: false },
    profilepicture: TEXT,
    riskvalue: INTEGER,
    createdate: DATE,
    payingoptions: JSONB,
    emails: { type: JSONB, allowNull: false },
    company: VIRTUAL,
    teams: BOOLEAN,
    marketplace: BOOLEAN,
    billing: BOOLEAN
  });

  return User;
};
