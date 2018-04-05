export default (sequelize, { NOW, DATE, TEXT, JSONB }) => {
  const Log = sequelize.define("log_data", {
    time: { type: DATE, defaultValue: NOW() },
    eventtype: TEXT,
    eventdata: JSONB,
    ip: TEXT
  });

  Log.associate = ({ Unit }) => {
    Log.belongsTo(Unit, { foreignKey: "user" });
    Log.belongsTo(Unit, { foreignKey: "sudoer" });
  };

  return Log;
};
