/**
 * Generates event listener which handles file upload and updates progress to specified message handler
 */
export const uploadFileHandlerGenerator = (
  presignedFormEndpoint, // API to generate presigned form for uploads
  imageBucket, // Image bucket we are using to upload images to
  userId,
  uploadSuccessHandler,
  messageHandler
) => e => {
  console.log(e.target.files);
  const file = e.target.files[0];
  if (!file) {
    messageHandler({
      type: "danger",
      message: "No file selected"
    });
    return;
  }

  const ext =
    file.name.indexOf(".") > 0
      ? file.name.substring(file.name.indexOf(".") + 1)
      : "jpg";

  const targetFileName = userId + "-" + new Date().getTime() + "." + ext;
  const targetFolder = "profile/";

  messageHandler({
    message: "Uploading",
    type: "info",
    start: true
  });
  console.info("Generating a upload form", file);
  fetch(presignedFormEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      s3Url: "s3://" + imageBucket + "/" + targetFolder + targetFileName
    })
  })
    .then(presignedResponse => presignedResponse.json())
    .then(presigned => {
      console.info("Generated link", presigned);
      messageHandler({
        message: "Got presigned form"
      });
      const form = new FormData();
      for (const field in presigned.fields) {
        if (presigned.fields.hasOwnProperty(field)) {
          console.info("field " + field + " = " + presigned.fields[field]);
          form.append(field, presigned.fields[field]);
        }
      }
      form.append("file", file);

      fetch(presigned.url, {
        method: "POST",
        body: form
      })
        .then(uploadResponse =>
          uploadResponse.headers["Content-Type"] === "application/json"
            ? uploadResponse.json()
            : uploadResponse.status === 204
            ? uploadResponse
            : uploadResponse.text()
        )
        .then(upload => {
          console.info("Uploaded", upload);
          messageHandler({
            message: "Uploaded"
          });
          uploadSuccessHandler(
            imageBucket,
            file.name,
            upload.url + targetFolder + targetFileName
          );
        })
        .catch(uploadError => {
          console.warn("Failed to upload", uploadError);
          messageHandler({
            type: "warning",
            message: "Upload failed"
          });
        });
    })
    .catch(presignedError => {
      console.warn("Failed to generate upload link", presignedError);
      messageHandler({
        type: "warning",
        message: "Presigned form failed"
      });
    });
};
