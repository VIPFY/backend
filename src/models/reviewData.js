export default (sequelize, { TEXT, SMALLINT, DATE, NOW }) => {
  const ReviewData = sequelize.define("review_data", {
    reviewdate: {
      type: DATE,
      defaultValue: NOW
    },
    stars: {
      type: SMALLINT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      }
    },
    reviewtext: TEXT
  });

  ReviewData.associate = ({ Unit, App }) => {
    ReviewData.belongsTo(Unit, { foreignKey: "unitid" });
    ReviewData.belongsTo(App, { foreignKey: "appid" });
    ReviewData.belongsTo(ReviewData, { foreignKey: "answerto" });
  };

  return ReviewData;
};
