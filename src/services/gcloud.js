// Imports the Google Cloud client library
import Storage from "@google-cloud/storage";
import fs from "fs";

// Your Google Cloud Platform project ID
const projectId = "vipfy-148316";

// Creates a client
const storage = new Storage({ projectId });

// The name for the new bucket
const bucketName = "vipfy-imagestore-01";
// eslint-disable-next-line
export const uploadFile = async (file, name) => {
  const localReadStream = fs.createReadStream(file);
  const remoteWriteStream = storage
    .bucket(bucketName)
    .file(name)
    .createWriteStream();
  localReadStream
    .pipe(remoteWriteStream)
    .on("error", err => console.log(err))
    .on("finish", res => {
      console.log(res);

      return true;
    });
  // try {
  //   const res = await storage.bucket(bucketName).upload(file);
  //   console.log(res);
  //
  //   return true;
  // } catch (err) {
  //   throw new Error(err);
  // }
};
