export default (sequelize, { JSONB, TIME }) => {
  const Licence = sequelize.define("licence_data", {
    options: JSONB,
    starttime: TIME,
    endtime: TIME
  });

  Licence.associate = ({ BoughtPlan, Unit }) => {
    Licence.belongsTo(BoughtPlan, { foreignKey: "boughtplanid" });
    Licence.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return Licence;
};
