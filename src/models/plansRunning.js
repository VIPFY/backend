export default (sequelize, { TEXT, TIME, JSONB, INTEGER, DECIMAL, CHAR }) => {
  const PlansRunning = sequelize.define("plans_running", {
    name: TEXT,
    teaserdescription: TEXT,
    features: JSONB,
    startdate: TIME,
    enddate: TIME,
    numlicences: INTEGER,
    amount: DECIMAL(10, 2),
    currency: {
      type: CHAR(3),
      validate: {
        len: [1, 3]
      },
      defaultValue: "USD"
    },
    options: JSONB
  });

  PlansRunning.associate = ({ App }) => {
    PlansRunning.belongsTo(App, { foreignKey: "appid" });
  };

  return PlansRunning;
};
