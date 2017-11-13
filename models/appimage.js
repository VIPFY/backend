export default (sequelize, { INTEGER, STRING }) => {
  const AppImage = sequelize.define(
    "appimage",
    {
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      appid: {
        type: INTEGER,
        allowNull: false
      },
      link: {
        type: STRING,
        allowNull: false
      },
      sequence: {
        type: INTEGER
      }
    },
    { timestamps: false }
  );

  return AppImage;
};
