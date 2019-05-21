import AWS from "aws-sdk";
import fs from "fs";
import moment from "moment";
import { formatFilename } from "../helpers/functions";

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

export const uploadUserImage = async ({ stream, filename }, folder) => {
  const ourFilename = formatFilename(filename);
  const Key = `${folder}/${ourFilename}`;
  const Bucket = "userimages.vipfy.store";

  try {
    const Body = stream;

    const params = {
      Key,
      Body,
      Bucket
    };

    await s3.upload(params).promise();

    return Key;
  } catch (err) {
    throw new Error(err);
  }
};

export const uploadTeamImage = async ({ stream, filename }, folder) => {
  const ourFilename = formatFilename(filename);
  const Key = `${folder}/${ourFilename}`;
  const Bucket = "userimages.vipfy.store";

  try {
    const Body = stream;

    const params = {
      Key,
      Body,
      Bucket
    };

    await s3.upload(params).promise();

    return Key;
  } catch (err) {
    throw new Error(err);
  }
};

export const uploadAppImage = async (
  { stream, filename },
  folder,
  fileName
) => {
  const ourFilename = fileName || formatFilename(filename);
  const Key = `${folder}/${ourFilename}`;
  const Bucket = "appimages.vipfy.store";

  try {
    const Body = stream;

    const params = {
      Key,
      Body,
      Bucket
    };

    await s3.upload(params).promise();

    return Key;
  } catch (err) {
    throw new Error(err);
  }
};

export const deleteUserImage = async (file, folder) => {
  const params = {
    Key: file,
    Bucket: "userimages.vipfy.store"
  };
  return s3.deleteObject(params).promise;
};

export const deleteAppImage = async (file, folder) => {
  const params = {
    Key: file,
    Bucket: "appimages.vipfy.store"
  };
  return s3.deleteObject(params).promise;
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
