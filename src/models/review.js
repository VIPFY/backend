export default (sequelize, { TEXT, SMALLINT, DATE, NOW }) => {
  const Review = sequelize.define("review_data", {
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

  Review.associate = ({ User, App }) => {
    Review.belongsTo(User, { foreignKey: "reviewer" });
    Review.belongsTo(App, { foreignKey: "appid" });
    Review.belongsTo(Review, { foreignKey: "answerto" });
  };

  return Review;
};
