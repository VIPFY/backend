import fs from "fs";
import path from "path";
import moment from "moment";
import Storage from "@google-cloud/storage";
import { formatFilename } from "../helpers/functions";

/* eslint-disable no-shadow */

const { GCLOUD_PLATFORM_ID } = process.env;

// Creates a client
const storage = new Storage({
  GCLOUD_PLATFORM_ID,
  keyFilename: path.join(__dirname, "../..", "Vipfy-4c183d5274a4.json")
});

// The name for the new bucket
const bucketName = "vipfy-imagestore-01";

export const uploadFile = async ({ path, name }, folder) => {
  const profilepicture = formatFilename(name);
  const destination = `${folder}/${profilepicture}`;

  try {
    await storage.bucket(bucketName).upload(path, { destination, public: true });
    await fs.unlinkSync(path);

    return profilepicture;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const deleteFile = async (file, folder) => {
  try {
    await storage.bucket(bucketName).deleteFiles({ prefix: `${folder}/${file}` });

    return true;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const uploadInvoice = async (path, name, year) => {
  const destination = `${year}/${name}`;

  try {
    await storage.bucket("vipfy-invoices").upload(path, { destination, public: false });
    await fs.unlinkSync(path);

    return true;
  } catch (err) {
    return err;
  }
};

export const createDownloadLink = async (billname, time) => {
  try {
    const year = moment(time).format("YYYY");
    const bill = storage.bucket(`vipfy-invoices/${year}`).file(billname);
    const expires = moment().add(1, "hours");
    const config = { action: "read", expires };

    const url = await bill.getSignedUrl(config);

    return url[0];
  } catch (err) {
    return err;
  }
};
