import * as uuidV4 from 'uuid/v4';

/**
 * Generates event listener which handles file upload and updates
 * progress to specified message handler
 */
const uploadFileHandlerGenerator = (
  presignedFormEndpoint, // API to generate presigned form for uploads
  imageBucket, // Image bucket we are using to upload images to
  userId,
  uploadSuccessHandler,
  onMessage,
) => (e) => {
  console.log(e.target.files);
  const file = e.target.files[0];
  if (!file) {
    onMessage({
      id: uuidV4(),
      type: 'warning',
      message: 'No file selected',
      failed: true,
    });

    return;
  }

  let ext = file.name.lastIndexOf('.') > 0
    ? file.name.substring(file.name.lastIndexOf('.') + 1)
    : 'jpg';
  if (ext === 'jpeg') {
    ext = 'jpg';
  }

  const targetFileName = `${userId}-${new Date().getTime()}.${ext}`;
  const targetFolder = 'profile/';

  if (['jpg', 'png'].find((allowed) => allowed === ext.toLowerCase()) === undefined) {
    onMessage({
      id: uuidV4(),
      type: 'warning',
      message: `Unknown file type: ${ext}`,
      failed: true,
    });
    return;
  }

  onMessage({
    id: uuidV4(),
    message: 'Uploading',
    type: 'info',
    start: true,
  });

  console.info('Generating an upload form', file);

  fetch(presignedFormEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      s3Url: `s3://${imageBucket}/${targetFolder}${targetFileName}`,
    }),
  })
    .then((presignedResponse) => presignedResponse.json())
    .then((presigned) => {
      console.info('Generated link', presigned);
      onMessage({
        id: uuidV4(),
        message: 'Got presigned form',
      });

      const form = new FormData();
      Object.keys(presigned.fields).forEach((field) => {
        console.info(`field ${field} = ${presigned.fields[field]}`);
        form.append(field, presigned.fields[field]);
      });
      form.append('file', file);

      return fetch(presigned.url, {
        method: 'POST',
        body: form,
      })
        .then((uploadResponse) => (uploadResponse.headers['Content-Type'] === 'application/json'
          ? uploadResponse.json()
          : uploadResponse.status === 204
            ? uploadResponse
            : uploadResponse.text()))
        .then((upload) => {
          console.info('Uploaded', upload);
          onMessage({
            id: uuidV4(),
            message: 'Uploaded',
          });
          return uploadSuccessHandler(
            imageBucket,
            file.name,
            upload.url + targetFolder + targetFileName,
          );
        })
        .catch((uploadError) => {
          console.warn('Failed to upload', uploadError);
          onMessage({
            id: uuidV4(),
            type: 'warning',
            message: 'Upload failed',
            failed: true,
          });
          return Promise.resolve();
        });
    })
    .catch((presignedError) => {
      console.warn('Failed to generate upload link', presignedError);
      onMessage({
        id: uuidV4(),
        type: 'warning',
        message: 'Presigned form failed',
        failed: true,
      });
      return Promise.resolve();
    });
};

export default uploadFileHandlerGenerator;
