export default (sequelize, { INTEGER, DECIMAL, JSONB, TEXT, TIME, STRING, BOOLEAN }) => {
  const Plan = sequelize.define("plan_data", {
    name: TEXT,
    teaserdescription: TEXT,
    features: JSONB,
    startdate: TIME,
    enddate: TIME,
    numlicences: INTEGER,
    price: DECIMAL(10, 2),
    currency: {
      type: STRING(3),
      validate: {
        len: [1, 3]
      },
      defaultValue: "USD"
    },
    options: JSONB,
    payperiod: {
      type: JSONB,
      set(period) {
        const testValue = Object.keys(period)[0];
        const interval = `${testValue == "years" ? period.years : 0} years, ${
          testValue == "mons" ? period.months : 0
        } mons, ${testValue == "days" ? period.days : 0} days, 0 hours, 0 mins, 0 secs`;
        this.setDataValue("payperiod", interval);
      }
    },
    cancelperiod: {
      type: JSONB,
      set(period) {
        const testValue = Object.keys(period)[0];
        const interval = `${testValue == "years" ? period.years : 0} years, ${
          testValue == "mons" ? period.months : 0
        } mons, ${testValue == "days" ? period.days : 0} days, 0 hours, 0 mins, 0 secs`;

        this.setDataValue("cancelperiod", interval);
      }
    },
    optional: { type: BOOLEAN, defaultValue: false },
    gototime: TEXT,
    stripedata: JSONB
  });

  Plan.associate = ({ App }) => {
    Plan.belongsTo(App, { foreignKey: "appid" });
    Plan.belongsTo(Plan, { foreignKey: "gotoplan" });
    Plan.belongsTo(Plan, { foreignKey: "mainplan" });
  };

  return Plan;
};
