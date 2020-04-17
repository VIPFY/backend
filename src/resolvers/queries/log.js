import { decode } from "jsonwebtoken";
import { requiresVipfyAdmin } from "../../helpers/permissions";
import { NormalError } from "../../errors";

export default {

    fetchAllLogs: requiresVipfyAdmin().createResolver(
        async (_P, { limit, offset }, { models }) => {
            try {

                // const {
                //   user: { company }
                // } = decode(session.token);


                const allLogs = await models.Log.findAll({
                    limit,
                    offset
                    // attributes: [
                    //     "id",
                    //     "icon",
                    //     "logo",
                    //     "disabled",
                    //     "name",
                    //     "teaserdescription",
                    //     "features",
                    //     "cheapestprice",
                    //     "avgstars",
                    //     "cheapestpromo",
                    //     "needssubdomain",
                    //     "options",
                    //     "developer",
                    //     "developername",
                    //     "supportunit",
                    //     "color",
                    //     "hidden"
                    // ],
                    // where: {
                    //     disabled: false,
                    //     deprecated: false,
                    //     hidden: false,
                    //     owner: { [models.Op.or]: [null, company] }
                    // },
                    // order: sortOptions ? [[sortOptions.name, sortOptions.order]] : ""
                });

                return allLogs;
            }

            catch (err) {
                throw new NormalError({ message: err.message, internalData: { err } });
            }
        }
    )
};
