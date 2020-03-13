import models from "@vipfy-private/sequelize-setup";
import moment from "moment";
import { uniq } from "lodash";
import { uploadInvoice } from "../services/aws";
import renderInvoice from "./invoiceGenerator";
import { groupBy } from "./functions";
import { sendEmail } from "./email";
import { InvoiceError } from "../errors";
import logger from "../loggers";

export default async (unitid, throwErr) =>
  // eslint-disable-next-line
  models.sequelize.transaction(async ta => {
    try {
      const billData = await models.sequelize.query(
        `
        SELECT bd.id,
              bd.buytime,
              bd.totalprice as "unitPrice",
              bd.totalfeatures,
              bd.alias,
              ad.name as service,
              pd.id as planid,
              pd.currency,
              json_build_object('name', bd.alias,'data', bd.totalfeatures->>'users') as description
        FROM boughtplan_view bd
          INNER JOIN plan_data pd ON bd.planid = pd.id
          INNER JOIN app_data ad ON pd.appid = ad.id
        WHERE (bd.endtime IS NULL OR bd.endtime > DATE_TRUNC('month', NOW()))
          AND bd.disabled = FALSE
          AND bd.payer = :company
          AND (pd.options ->> 'external' IS NULL OR pd.options ->> 'external' = 'FALSE')
        GROUP BY bd.id, ad.name, pd.id;
      `,
        {
          replacements: { company: unitid },
          type: models.sequelize.QueryTypes.SELECT,
          transaction: ta
        }
      );

      const groupByCurrency = groupBy(billData, billPos => billPos.currency);

      const tags = { [models.Op.contains]: ["billing"] };

      const p1 = models.Address.findOne({
        attributes: ["country", "address"],
        where: { unitid, tags },
        raw: true,
        transaction: ta
      });

      const p2 = models.DepartmentEmail.findAll({
        attributes: ["email"],
        where: { departmentid: unitid, tags },
        raw: true,
        transaction: ta
      });

      const p3 = models.Phone.findOne({
        attributes: ["number"],
        where: { unitid, tags },
        raw: true,
        transaction: ta
      });

      const p4 = models.Department.findOne({
        attributes: ["name", "legalinformation"],
        where: { unitid },
        raw: true,
        transaction: ta
      });

      // eslint-disable-next-line
      let [address, emails, phone, company] = await Promise.all([
        p1,
        p2,
        p3,
        p4
      ]);

      if (!address) {
        // This should throw an error later
        address = {
          address: {
            street: "Not set yet",
            zip: "00000",
            city: "Not set"
          },
          country: "Not set"
        };
      }

      if (!phone) {
        phone = "+00000000000000";
      }

      const { email } = uniq(emails)[0];

      const {
        country,
        address: { zip, city, street }
      } = address;

      const date = moment().format("YYYY-MM-DD");
      const dueDate = moment()
        .add(2, "weeks")
        .format("YYYY-MM-DD");

      const year = moment().format("YYYY");

      const billObjects = Object.values(groupByCurrency);
      for await (const pos of billObjects) {
        const billItems = { positions: [], credits: [] };

        const total = pos
          .reduce((acc, cV) => acc + parseFloat(cV.unitPrice), 0)
          .toFixed(2);

        const createBill = await models.Bill.create(
          {
            unitid,
            billname: "temp",
            amount: total,
            currency: pos[0].currency
          },
          { transaction: ta }
        );

        const bill = createBill.get();

        const groupData = groupBy(pos, billPos => billPos.service);
        for await (const group of Object.values(groupData)) {
          const billPos = {
            service: group[0].service,
            currency: group[0].currency,
            description: [],
            boughtPlanIds: []
          };

          let unitPrice = 0.0;
          for (const position of group) {
            billPos.description.push(position.description);
            billPos.boughtPlanIds.push(position.id);
            unitPrice += parseFloat(position.unitPrice);
          }

          billPos.unitPrice = unitPrice.toFixed(2);
          billItems.positions.push(billPos);
          const createBillPos = await models.BillPosition.create(
            {
              billid: bill.id,
              price: billPos.unitPrice,
              positiondata: billPos.description,
              currency: billPos.currency,
              boughtPlanIds: billPos.boughtPlanIds
            },
            { transaction: ta }
          );

          const billPosData = createBillPos.get();
          billPos.id = billPosData.id;
        }

        let totalCredits = 0;

        for await (const position of billItems.positions) {
          if (position.unitPrice == 0) {
            continue;
          }

          position.discountedPrice = parseFloat(position.unitPrice);

          const credits = await models.sequelize.query(
            `
        SELECT cuhv.*, array_agg(DISTINCT bpd.id) as spendablefor
        FROM creditsuserhas_view cuhv
          LEFT JOIN creditsspendableforplan_data csfpd ON cuhv.creditid = csfpd.creditid
          RIGHT JOIN boughtplan_view bpd ON csfpd.planid = bpd.planid
        WHERE cuhv.unitid = :company
          AND bpd.payer = :company
        GROUP BY cuhv.amountremaining, cuhv.currency, cuhv.source, cuhv.unitid, cuhv.id, cuhv.expiresat, cuhv.createdat,
                 cuhv.creditid;
        `,
            {
              replacements: { company: unitid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta
            }
          );

          for await (const credit of credits) {
            if (credit.amountremaining <= 0) {
              continue;
            }

            if (
              position.boughtPlanIds.some(bpId =>
                credit.spendablefor.includes(bpId)
              )
            ) {
              let amount = position.discountedPrice;
              if (credit.amountremaining <= amount) {
                amount = credit.amountremaining;
              }

              totalCredits += parseFloat(amount);

              const discountItem = {
                ...position,
                description: [{ name: Object.keys(credit.source)[0], data: 1 }],
                discount: amount
              };

              const createCreditPos = await models.BillPosition.create(
                {
                  billid: bill.id,
                  price: `-${discountItem.discount}`,
                  positiondata: discountItem.description,
                  currency: discountItem.currency,
                  boughtPlanIds: discountItem.boughtPlanIds
                },
                { transaction: ta }
              );

              const creditPosData = createCreditPos.get();
              discountItem.id = creditPosData.id;
              delete discountItem.unitPrice;
              delete discountItem.discountedPrice;

              await models.CreditsSpentFor.create(
                {
                  amount,
                  creditid: credit.creditid,
                  billpositionid: creditPosData.id,
                  billid: bill.id
                },
                { transaction: ta }
              );

              billItems.credits.push(discountItem);
            }
          }
        }

        const totalCheck = billItems.positions
          .reduce((acc, cV) => acc + parseFloat(cV.unitPrice), 0)
          .toFixed(2);

        if (totalCheck != total) {
          throw new Error("Prices don't match!");
        }

        const number = `VM-${year}-${bill.id}-01`;

        const data = {
          total: total - totalCredits,
          currency: pos[0].currency,
          invoice: {
            number,
            date,
            dueDate,
            explanation: `Der Betrag wird bis zum ${dueDate} von ihrer Kreditkarte eingezogen.
        Bitte sorgen Sie für eine ausreichende Deckung der Karte.`
          },
          billItems,
          seller: {
            logo: "../files/vipfy-signet.png",
            company: "VIPFY GmbH",
            registrationNumber: "HRB 104968",
            taxId: "DE320082973",
            address: {
              street: "Campus",
              number: "A1 1",
              zip: "66123",
              city: "Saarbrücken",
              region: "Saarland",
              country: "Germany"
            },
            phone: "+49 681 302 - 64936",
            email: "billing@vipfy.store",
            website: "www.vipfy.store",
            bank: {
              name: "Deutsche Bank",
              swift: "XXXXXX",
              iban: "DE51 5907 0000 0012 3018 00"
            }
          },
          buyer: {
            company: company.name,
            // taxId:
            //   company.legalinformation && company.legalinformation.vatID
            //     ? company.legalinformation.vatID
            //     : "",
            address: { street, zip, city, country },
            phone,
            email
          }
        };

        const pathPdf = `${__dirname}/../files/${number}.pdf`;

        await renderInvoice({
          data,
          path: `${__dirname}/../templates/invoice.html`,
          pathPdf,
          htmlPath: `${__dirname}/../templates/${number}.html`
        });

        await models.Bill.update(
          { billname: number, invoicedata: data },
          { where: { id: bill.id }, transaction: ta, returning: true }
        );

        await uploadInvoice(pathPdf, number);
      }

      return true;
    } catch (err) {
      await sendEmail({
        templateId: "d-6b1dbe42fb264c6f8056eda5ee2bbb93",
        fromName: "VIPFY",
        personalizations: [
          {
            to: [{ email: "billingerror@vipfy.store" }],
            dynamic_template_data: { company: unitid }
          }
        ]
      });

      if (throwErr) {
        logger.error(err);
        throw new InvoiceError({ customer: unitid });
      }
    }
  });
