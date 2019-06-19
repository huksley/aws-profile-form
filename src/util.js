export const urlToBucketName = s3Url => {
  if (s3Url.startsWith("s3://")) {
    const hostPath = s3Url.substring(s3Url.indexOf("s3://") + "s3://".length);
    const host = hostPath.substring(0, hostPath.indexOf("/"));
    const path = hostPath.substring(hostPath.indexOf("/") + 1);
    return host;
  } else {
    throw new Error("Unsupported protocol: " + s3Url);
  }
};

export const urlToKeyName = s3Url => {
  if (s3Url.startsWith("s3://")) {
    const hostPath = s3Url.substring(s3Url.indexOf("s3://") + "s3://".length);
    const host = hostPath.substring(0, hostPath.indexOf("/"));
    const path = hostPath.substring(hostPath.indexOf("/") + 1);
    return path;
  } else {
    throw new Error("Unsupported protocol: " + s3Url);
  }
};

export const s3UrlToHttp = (s3Url) => {
  return (
    "https://" +
    urlToBucketName(s3Url) +
    ".s3-" + process.env.AWS_REGION + ".amazonaws.com/" +
    urlToKeyName(s3Url)
  );
}
