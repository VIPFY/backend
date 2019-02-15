import AWS from "aws-sdk";
import fs from "fs";
import moment from "moment";

const s3 = new AWS.S3({ region: "eu-central-1" });

export const uploadInvoice = async (path, name) => {
  const year = moment().format("YYYY");
  const Key = `${year}/${name}.pdf`;
  const Bucket = process.env.AWS_BUCKET
    ? "invoices.dev.vipfy.store"
    : "invoices.vipfy.store";

  try {
    const Body = fs.createReadStream(path);

    const params = {
      Key,
      Body,
      Bucket,
      ContentType: "application/pdf"
    };

    await s3.upload(params).promise();
    fs.unlinkSync(path);

    return true;
  } catch (err) {
    throw new Error(err);
  }
};

/**
 * Generates a link where we can download the invoice.
 *
 * @export
 * @param {string} billname
 * @param {string} time
 * @returns {string}
 */
export const getInvoiceLink = async (billname, time) => {
  const year = moment(time).format("YYYY");
  const Key = `${year}/${billname}.pdf`;
  const Bucket = process.env.AWS_BUCKET
    ? "invoices.dev.vipfy.store"
    : "invoices.vipfy.store";

  try {
    const url = await s3.getSignedUrl("getObject", {
      Bucket,
      Key,
      Expires: 3600
    });

    return url;
  } catch (err) {
    throw new Error(err);
  }
};
