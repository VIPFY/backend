export default (sequelize, { JSONB, DATE, BOOLEAN, NOW }) => {
  const Licence = sequelize.define("licence_data", {
    options: JSONB,
    starttime: { type: DATE, defaultValue: NOW() },
    endtime: DATE,
    agreed: { type: BOOLEAN, allowNull: false },
    disabled: { type: BOOLEAN, allowNull: false },
    key: JSONB
  });

  Licence.associate = ({ BoughtPlan, Unit }) => {
    Licence.belongsTo(BoughtPlan, { foreignKey: "boughtplanid" });
    Licence.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return Licence;
};
