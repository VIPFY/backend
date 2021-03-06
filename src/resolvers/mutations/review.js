import jwt from "jsonwebtoken";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";

/* eslint-disable no-unused-vars */

export default {
  writeReview: requiresRights(["view-apps"]).createResolver(
    async (_p, { appid, stars, text }, { models, session }) => {
      try {
        const {
          user: { unitid }
        } = jwt.decode(session.token);
        const p1 = models.App.findOne({ where: { id: appid, owner: null } });
        const p2 = models.User.findByPk(unitid);
        const [app, user] = await Promise.all([p1, p2]);

        if (!app || !user) {
          throw new Error("App or User doesn't exist!");
        } else if (stars > 5 || stars < 1) {
          throw new Error("Rating must be between 1 and 5 stars!");
        } else {
          const review = await models.ReviewData.create({
            stars,
            reviewtext: text,
            unitid,
            appid
          });

          return review;
        }
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }
  ),

  rateReview: requiresRights(["view-apps"]).createResolver(
    async (_parent, { reviewid, balance }, { models, session }) => {
      try {
        const {
          user: { unitid }
        } = jwt.decode(session.token);

        const p1 = models.User.findByPk(unitid);
        const p2 = models.Review.findByPk(reviewid);
        const p3 = models.ReviewHelpful.findOne({
          where: { reviewid, unitid }
        });
        const [commenter, review, changeRating] = await Promise.all([
          p1,
          p2,
          p3
        ]);

        if (!review) {
          throw new Error("Review doesn't exist!");
        } else if (!commenter) {
          throw new Error("User doesn't exist!");
        } else if (!changeRating) {
          const rate = await models.ReviewHelpful.create({
            balance,
            reviewid,
            unitid
          });

          return { ok: true, balance };
        } else {
          if (changeRating.balance == balance) {
            throw new Error(`This is the same value: ${balance}`);
          }
          const changing = await models.ReviewHelpful.update(
            { balance },
            {
              where: {
                unitid,
                reviewid
              }
            }
          );
          return { ok: true, balance };
        }
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
