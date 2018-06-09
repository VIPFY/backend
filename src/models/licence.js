export default (sequelize, { JSONB, DATE, BOOLEAN }) => {
  const Licence = sequelize.define("licence_data", {
    options: JSONB,
    starttime: DATE,
    endtime: DATE,
    agreed: BOOLEAN,
    disabled: BOOLEAN,
    key: JSONB,
  });

  Licence.associate = ({ BoughtPlan, Unit }) => {
    Licence.belongsTo(BoughtPlan, { foreignKey: "boughtplanid" });
    Licence.belongsTo(Unit, { foreignKey: "unitid" });
  };

  Licence.removeAttribute("id");

  return Licence;
};
