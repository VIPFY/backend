export default (sequelize, { STRING, DATE, JSONB, INTEGER, TEXT, BOOLEAN, ENUM }) => {
  const Partner = sequelize.define("partners_view", {
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
    position: TEXT,
    emails: JSONB
  });

  Partner.associate = ({ Unit }) => Partner.belongsTo(Unit, { foreignKey: "unitid" });

  return Partner;
};
