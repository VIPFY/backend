export default (sequelize, { TEXT, TIME, JSONB }) => {
  const PromosRunning = sequelize.define("promos_running", {
    name: TEXT,
    startdate: TIME,
    enddate: TIME,
    restrictions: JSONB,
    description: TEXT,
    discount: JSONB
  });

  PromosRunning.associate = ({ Plan, Unit }) => {
    PromosRunning.belongsTo(Plan, { foreignKey: "planid" });
    PromosRunning.belongsTo(Unit, { foreignKey: "sponsor" });
  };

  return PromosRunning;
};
