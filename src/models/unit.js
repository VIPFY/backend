export default (sequelize, { JSONB, BOOLEAN, TEXT, NOW, INTEGER, TIME }) => {
  const Unit = sequelize.define("unit_data", {
    payingoptions: JSONB,
    banned: { type: BOOLEAN, defaultValue: false },
    deleted: { type: BOOLEAN, defaultValue: false },
    suspended: { type: BOOLEAN, defaultValue: false },
    profilepicture: TEXT,
    riskvalue: INTEGER,
    createdate: { type: TIME, defaultValue: NOW() },
    position: TEXT
  });

  return Unit;
};
