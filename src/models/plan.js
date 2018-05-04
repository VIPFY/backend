export default (sequelize, { INTEGER, DECIMAL, JSONB, TEXT, TIME, CHAR, BOOLEAN }) => {
  const Plan = sequelize.define("plan_data", {
    name: TEXT,
    teaserdescription: TEXT,
    features: JSONB,
    startdate: TIME,
    enddate: TIME,
    numlicences: INTEGER,
    price: DECIMAL(10, 2),
    currency: {
      type: CHAR(3),
      validate: {
        len: [1, 3]
      },
      defaultValue: "USD"
    },
    options: JSONB,
    payperiod: TEXT,
    cancelperiod: TEXT,
    optional: { type: BOOLEAN, defaultValue: false },
    gototime: TEXT
  });

  Plan.associate = ({ App }) => {
    Plan.belongsTo(App, { foreignKey: "appid" });
    Plan.belongsTo(Plan, { foreignKey: "gotoplan" });
    Plan.belongsTo(Plan, { foreignKey: "mainplan" });
  };

  return Plan;
};
