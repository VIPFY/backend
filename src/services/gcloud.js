import fs from "fs";
import Storage from "@google-cloud/storage";
import { formatFilename } from "../helpers/functions";

// Your Google Cloud Platform project ID
const projectId = "vipfy-148316";

// Creates a client
const storage = new Storage({ projectId });

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
