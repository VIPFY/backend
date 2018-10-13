import crypto from "crypto";
import fs from "fs";
import path from "path";
import moment from "moment";
import readChunk from "read-chunk";
import fileType from "file-type";
import Storage from "@google-cloud/storage";
import { createClient } from "@google/maps";

import models from "@vipfy-private/sequelize-setup";
import { formatFilename } from "../helpers/functions";
import logger from "../loggers";

/* eslint-disable no-shadow */
const fileHash = (filename, algorithm = "SHA256") =>
  // eslint-disable-next-line
  new Promise((resolve, reject) => {
    // Algorithm depends on availability of OpenSSL on platform
    // Another algorithms: 'sha1', 'md5', 'sha256', 'sha512' ...
    const shasum = crypto.createHash(algorithm);
    try {
      const s = fs.ReadStream(filename);
      s.on("data", data => {
        shasum.update(data);
      });
      // making digest
      s.on("end", () => {
        const hash = shasum.digest("hex");
        return resolve(hash);
      });
    } catch (error) {
      return reject(new Error("calc fail"));
    }
  });

const { GCLOUD_PLATFORM_ID, GOOGLE_PLACES_API } = process.env;

// the server doesn't need the key file
let keyFilename = path.join(__dirname, "../..", "Vipfy-4c183d5274a4.json");
if (!fs.existsSync(keyFilename)) {
  keyFilename = undefined;
}

export const googleMapsClient = createClient({
  key: GOOGLE_PLACES_API,
  Promise
});

// Creates a client for GCLOUD
const storage = new Storage({
  GCLOUD_PLATFORM_ID,
  keyFilename
});

// The Buckets name
const imageStore = "vipfy-imagestore-01";
const messageStore = "vipfy-messageattachments";

export const uploadFile = async ({ path, name }, folder) => {
  const profilepicture = formatFilename(name);
  const destination = `${folder}/${profilepicture}`;

  try {
    await storage
      .bucket(imageStore)
      .upload(path, { destination, public: true });
    fs.unlinkSync(path);

    return profilepicture;
  } catch (err) {
    fs.unlinkSync(path);
    throw new Error(err.message);
  }
};

export const deleteFile = async (file, folder) => {
  try {
    await storage
      .bucket(imageStore)
      .deleteFiles({ prefix: `${folder}/${file}` });

    return true;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Upload a file to our Bucket. This is for the Messaging Component.
 *
 *
 * @export
 * @param {*} models
 * @param {number} messageId
 * @param {obj} attachment
 * @returns {obj}
 */
export const uploadAttachment = async (attachment, messageId, models) => {
  try {
    const attachBucket = storage.bucket(messageStore);
    let encryptionKey;
    const p1 = fileHash(attachment.path);
    const p2 = fileHash(attachment.path, "BLAKE2b512");

    const [hash1, hash2] = await Promise.all([p1, p2]);
    const blobname = `${hash1}-${hash2}`;

    encryptionKey = crypto.randomBytes(32).toString("base64");

    logger.debug("File Exists pre");
    const file = attachBucket.file(blobname, {});

    const fileExists = await file.exists();
    logger.debug("File Exists", { exists: fileExists[0], blobname });

    if (fileExists[0] == false) {
      await attachBucket.upload(attachment.path, {
        private: true,
        destination: blobname,
        encryptionKey: Buffer.from(encryptionKey, "base64")
      });

      logger.debug("File Uploaded", fileExists[0]);

      await file.get();
      await file.setMetadata({
        metadata: { messages: JSON.stringify([messageId]) }
      });
      logger.debug("Metadata set");
    } else {
      const [fetchedFile] = await file.getMetadata();

      if (!fetchedFile.metadata.messages) {
        fetchedFile.metadata.messages = "[]";
      }

      const messageArray = JSON.parse(fetchedFile.metadata.messages);
      messageArray.push(messageId);

      fetchedFile.metadata.messages = JSON.stringify(messageArray);

      await file.setMetadata(fetchedFile);

      const findKey = await models.sequelize.query(
        `SELECT e->>'key' as key
          FROM
            (
              SELECT jsonb_array_elements(payload->'files') e
              FROM message_data
              WHERE id IN (:messageArray)
            ) t
          WHERE
          e->>'blobname' = :blobname
          LIMIT 1`,
        {
          replacements: { messageArray, blobname },
          type: models.sequelize.QueryTypes.SELECT
        }
      );
      encryptionKey = findKey[0].key;
    }
    const fileInfo =
      fileType(readChunk.sync(attachment.path, 0, 4 + 4096)) || {};

    fs.unlinkSync(attachment.path);
    return {
      key: encryptionKey,
      blobname,
      filename: attachment.name,
      type: fileInfo.mime
    };
  } catch (err) {
    console.log(err);
    fs.unlinkSync(attachment.path);
    throw new Error(err);
  }
};

export const uploadInvoice = async (path, name, year) => {
  const destination = `${year}/${name}`;

  try {
    await storage
      .bucket("vipfy-invoices")
      .upload(path, { destination, public: false });
    await fs.unlinkSync(path);

    return true;
  } catch (err) {
    return err;
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
export const invoiceLink = async (billname, time) => {
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

/**
 * Generates a link where we can download the attachment.
 *
 * @export
 * @param {number} id
 * @param {object} res
 * @returns {}
 */
export const attachmentLink = async (id, res) => {
  try {
    const attachBucket = storage.bucket(messageStore);

    const message = await models.MessageData.findOne({
      where: { id },
      raw: true,
      attributes: ["payload"]
    });

    if (!message.payload.files) {
      return false;
    }

    const { blobname, key } = message.payload.files[0];
    const remoteFile = attachBucket.file(blobname, {
      encryptionKey: Buffer.from(key, "base64")
    });
    const [fileExists] = await remoteFile.exists();

    if (!fileExists) {
      throw new Error("File not found!");
    }

    const promise = (resolve, reject) =>
      remoteFile
        .createReadStream()
        .on("error", err => reject(err))
        .on("response", response => console.log(response.body))
        .on("end", () => {
          res.end();
          resolve("Download complete");
        })
        .on("data", data => res.write(data));

    await new Promise(promise);

    return true;
  } catch (err) {
    throw new Error(err);
  }
};
