export default (sequelize, { INTEGER, STRING }) => {
  const AppImage = sequelize.define("appimage", {
    link: {
      type: STRING,
      allowNull: false
    },
    sequence: {
      type: INTEGER
    }
  });

  AppImage.associate = models => {
    AppImage.belongsTo(models.App, { foreignKey: "appid" });
  };

  return AppImage;
};
